import asyncio
import os
import sys
from datetime import datetime as dt
from dotenv import load_dotenv
from loguru import logger
import aiohttp

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.openai import OpenAILLMService
from pipecat.transports.services.daily import DailyParams, DailyTransport
from pipecat.processors.transcript_processor import TranscriptProcessor

from pipecat_flows import FlowManager, NodeConfig, FlowsFunctionSchema, FlowArgs

from tools import get_doctors, get_available_slots, book_appointment

load_dotenv()
logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001/api")
CLINIC_NAME = "City Health Clinic"

# ==================== TOOL HANDLERS ====================

async def handle_end_call(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    return None, create_end_call_node()

end_call_func = FlowsFunctionSchema(
    name="end_call",
    handler=handle_end_call,
    description="User wants to end the call.",
    properties={},
    required=[]
)

async def handle_urgent_case(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    return None, create_urgent_case_node()

urgent_case_func = FlowsFunctionSchema(
    name="urgent_case",
    handler=handle_urgent_case,
    description="GLOBAL CONDITION: User mentions emergency, severe pain, bleeding, or urgent care.",
    properties={},
    required=[]
)

async def handle_doctor_info(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    return None, create_doctor_info_node()

doctor_info_func = FlowsFunctionSchema(
    name="doctor_info",
    handler=handle_doctor_info,
    description="User asks about which doctors are available or their specialties.",
    properties={},
    required=[]
)

async def handle_start_booking(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    state = flow_manager.state.get("booking_data", {})
    for k, v in args.items():
        if v: state[k] = v
    flow_manager.state.update({"booking_data": state})
    return None, create_gather_info_node()

start_booking_func = FlowsFunctionSchema(
    name="start_booking",
    handler=handle_start_booking,
    description="User indicates intent to book an appointment.",
    properties={
        "specialization": {"type": "string"},
        "date": {"type": "string"},
    },
    required=[]
)

async def handle_check_slots(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    date = args.get("date")
    spec = args.get("specialization", "General")
    # simplified: getting doctors to find ID
    docs = await get_doctors()
    doc_id = docs["doctors"][0]["id"] if "doctors" in docs and docs["doctors"] else 1
    slots = await get_available_slots(doc_id, date)
    
    state = flow_manager.state.get("booking_data", {})
    state["date"] = date
    state["specialization"] = spec
    state["doctor_id"] = doc_id
    state["available_slots"] = slots.get("available_slots", [])
    flow_manager.state.update({"booking_data": state})
    
    return None, create_gather_info_node()

check_slots_func = FlowsFunctionSchema(
    name="check_slots",
    handler=handle_check_slots,
    description="Check available slots for a specific date and specialization.",
    properties={
        "date": {"type": "string", "description": "YYYY-MM-DD"},
        "specialization": {"type": "string"}
    },
    required=["date"]
)

async def handle_confirm_details(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    state = flow_manager.state.get("booking_data", {})
    for k, v in args.items():
        if v: state[k] = v
    flow_manager.state.update({"booking_data": state})
    return None, create_confirm_booking_node()

confirm_details_func = FlowsFunctionSchema(
    name="confirm_details",
    handler=handle_confirm_details,
    description="Call this when all details (date, time, patient name, patient phone) have been collected.",
    properties={
        "time": {"type": "string"},
        "patient_name": {"type": "string"},
        "patient_phone": {"type": "string"},
    },
    required=["time", "patient_name", "patient_phone"]
)

async def handle_finalize_booking(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    state = flow_manager.state.get("booking_data", {})
    await book_appointment(
        state.get("doctor_id", 1),
        state.get("date"),
        state.get("time"),
        state.get("patient_name"),
        state.get("patient_phone")
    )
    return None, create_success_node()

finalize_booking_func = FlowsFunctionSchema(
    name="finalize_booking",
    handler=handle_finalize_booking,
    description="User has confirmed the booking recap. Proceed to book in DB.",
    properties={},
    required=[]
)

# ==================== NODE DEFINITIONS ====================

def create_initial_node() -> NodeConfig:
    return NodeConfig(
        name="initial",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are Aria, receptionist at {CLINIC_NAME}.
The greeting has just been played. Wait for user to speak.
DO NOT greet again.
ACTIONS:
- User wants to book: call `start_booking`
- User has emergency: call `urgent_case`
- User asks about doctors: call `doctor_info`
"""
            }
        ],
        functions=[start_booking_func, urgent_case_func, doctor_info_func, end_call_func]
    )

def create_doctor_info_node() -> NodeConfig:
    return NodeConfig(
        name="doctor_info",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are answering questions about doctors.
We have:
- Dr. Smith (General Practice)
- Dr. Jones (Cardiology)
- Dr. Davis (Pediatrics)
Ask if they want to book an appointment with one of them.
IF yes -> call `start_booking`.
"""
            }
        ],
        functions=[start_booking_func, urgent_case_func, end_call_func]
    )

def create_gather_info_node() -> NodeConfig:
    return NodeConfig(
        name="gather_info",
        task_messages=[
            {
                "role": "system",
                "content": """You are collecting details for an appointment.
REQUIRED DETAILS: Date, Specialization, Time, Patient Name, Patient Phone.
FLOW:
1. First, establish Date and Specialization. If missing, ask.
2. If you have Date, call `check_slots` to get available times.
3. If you have Date and slots are known, offer the slots and ask for their preferred Time.
4. After Time, ask for Patient Name and Phone Number.
5. Once ALL details are gathered, call `confirm_details`.
Be concise and warm.
"""
            }
        ],
        functions=[check_slots_func, confirm_details_func, urgent_case_func, end_call_func]
    )

def create_confirm_booking_node() -> NodeConfig:
    return NodeConfig(
        name="confirm_booking",
        task_messages=[
            {
                "role": "system",
                "content": """Recap the booking details to the patient.
"Just to confirm, I have you down for an appointment on [Date] at [Time] for [Specialization], under the name [Patient Name] at [Phone]. Is that correct?"
IF YES -> call `finalize_booking`.
IF NO -> call `start_booking` to modify.
"""
            }
        ],
        functions=[finalize_booking_func, start_booking_func, end_call_func]
    )

def create_success_node() -> NodeConfig:
    return NodeConfig(
        name="success",
        task_messages=[
            {
                "role": "system",
                "content": """The appointment has been booked.
Say: "Perfect! Your appointment is successfully booked. We will send you an SMS confirmation shortly. Is there anything else I can assist you with?"
IF NO -> call `end_call`.
"""
            }
        ],
        functions=[end_call_func, doctor_info_func]
    )

def create_urgent_case_node() -> NodeConfig:
    return NodeConfig(
        name="urgent_case",
        task_messages=[
            {
                "role": "system",
                "content": """Say exactly: "I understand this is urgent. Please hold on while I immediately transfer you to our emergency nursing staff."
Then call `end_call`.
"""
            }
        ],
        functions=[end_call_func]
    )

def create_end_call_node() -> NodeConfig:
    return NodeConfig(
        name="end_call",
        task_messages=[
            {
                "role": "system",
                "content": "Say: 'Thank you for calling City Health Clinic. Have a wonderful day!' then stop speaking."
            }
        ],
        functions=[]
    )

# ==================== MAIN PIPELINE ====================

async def main():
    async with aiohttp.ClientSession() as session:
        transport = DailyTransport(
            room_url=os.getenv("DAILY_ROOM_URL", "https://yourdomain.daily.co/testroom"),
            token=os.getenv("DAILY_TOKEN", ""),
            bot_name="Aria",
            params=DailyParams(
                audio_out_enabled=True,
                audio_in_enabled=True,
                camera_out_enabled=False,
                camera_in_enabled=False,
                vad_enabled=True,
                vad_analyzer=SileroVADAnalyzer(),
                transcription_enabled=True,
            )
        )

        stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
        tts = CartesiaTTSService(api_key=os.getenv("CARTESIA_API_KEY"), voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22")
        llm = OpenAILLMService(api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1", model="llama-3.1-8b-instant")
        transcript_processor = TranscriptProcessor()

        # Initialize FlowManager
        flow_manager = FlowManager(
            create_initial_node(),
            llm=llm,
            tts=tts,
        )

        context = OpenAILLMContext(
            messages=[],
            tools=[]
        )
        context_aggregator = llm.create_context_aggregator(context)

        # FlowManager manages context
        flow_manager.initialize(context)

        pipeline = Pipeline([
            transport.input(),
            stt,
            transcript_processor,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ])

        task = PipelineTask(pipeline, PipelineParams(allow_interruptions=True))

        @transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(transport, participant):
            transport.capture_participant_transcription(participant["id"])
            greeting = f"Hello, thanks for calling {CLINIC_NAME}, I'm Aria. How can I help you today?"
            # Add greeting directly to context and TTS
            task.queue_frames([tts.speak(greeting)])
            await task.queue_frames([context_aggregator.user().get_context_frame()])

        @transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            logger.info("Participant left. Sending transcript to backend...")
            transcript = transcript_processor.get_transcript()
            payload = {
                "call_id": participant["id"],
                "caller_phone": "Unknown",
                "transcript": transcript,
            }
            async with session.post(f"{BACKEND_URL}/calls/ingest", json=payload) as resp:
                logger.info(f"Backend ingest status: {resp.status}")
            await task.cancel()

        runner = PipelineRunner()
        await runner.run(task)

if __name__ == "__main__":
    asyncio.run(main())
