import asyncio
import os
import sys
from datetime import datetime as dt
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from fastapi import WebSocket
from loguru import logger
import aiohttp
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.transports.websocket.fastapi import FastAPIWebsocketParams, FastAPIWebsocketTransport
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import (
    Frame, TTSSpeakFrame, LLMMessagesAppendFrame, EndTaskFrame,
    UserStartedSpeakingFrame, UserSpeakingFrame, TranscriptionFrame,
    BotStartedSpeakingFrame, BotStoppedSpeakingFrame
)
from pipecat_flows import FlowManager, NodeConfig, FlowsFunctionSchema, FlowArgs
from tools import get_doctors, get_available_slots, book_appointment

load_dotenv()
logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001/api")
CLINIC_NAME = "City Health Clinic"

class TranscriptProcessor(FrameProcessor):
    def __init__(self, context: LLMContext, task_getter=None):
        super().__init__()
        self._context = context
        self.last_interaction_time = asyncio.get_event_loop().time()
        self.task_getter = task_getter
        self.timeout_task = None
        self.is_running = True

    def start_timeout_monitoring(self):
        self.last_interaction_time = asyncio.get_event_loop().time()
        self.timeout_task = asyncio.create_task(self._monitor_silence())

    async def _monitor_silence(self):
        while self.is_running:
            await asyncio.sleep(1)
            now = asyncio.get_event_loop().time()
            if now - self.last_interaction_time > 12:
                # Reset interaction time to avoid spamming
                self.last_interaction_time = now
                if self.task_getter:
                    task = self.task_getter()
                    if task:
                        logger.info("Silence detected. Prompting user...")
                        await task.queue_frames([TTSSpeakFrame("Are you still there?")])

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)
        
        # Reset timeout on user speech/bot speech events
        if isinstance(frame, (UserStartedSpeakingFrame, UserSpeakingFrame, TranscriptionFrame,
                              BotStartedSpeakingFrame, BotStoppedSpeakingFrame, TTSSpeakFrame)):
            self.last_interaction_time = asyncio.get_event_loop().time()

    def stop_monitoring(self):
        self.is_running = False
        if self.timeout_task:
            self.timeout_task.cancel()

    def get_transcript(self) -> list:
        transcript = []
        for msg in self._context.messages:
            role = msg.get("role")
            if role in ["user", "assistant"]:
                content = msg.get("content")
                if isinstance(content, list):
                    text = " ".join([c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"])
                else:
                    text = str(content or "")
                
                if text.strip():
                    transcript.append({
                        "role": role,
                        "transcript": text,
                        "created_at": dt.now().isoformat()
                    })
        return transcript

class AssistantSpeechMonitor(FrameProcessor):
    def __init__(self, processor_to_reset):
        super().__init__()
        self.processor_to_reset = processor_to_reset

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)
        # Reset silence timeout when assistant frames (audio/TTS/speaking state) are emitted
        self.processor_to_reset.last_interaction_time = asyncio.get_event_loop().time()


# ==================== TOOL HANDLERS ====================

async def handle_end_call(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    await flow_manager.worker.queue_frames([
        TTSSpeakFrame("Thank you for calling City Health Clinic. Have a wonderful day!"),
        EndTaskFrame()
    ])
    return None, create_end_call_node()

end_call_func = FlowsFunctionSchema(
    name="end_call",
    handler=handle_end_call,
    description="User wants to end the call.",
    properties={},
    required=[]
)

async def handle_urgent_case(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    return None, create_urgent_case_node()

urgent_case_func = FlowsFunctionSchema(
    name="urgent_case",
    handler=handle_urgent_case,
    description="GLOBAL CONDITION: User mentions emergency, severe pain, medical advice, live transfer, or urgent care.",
    properties={},
    required=[]
)

async def handle_arrange_callback(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    await flow_manager.worker.queue_frames([
        TTSSpeakFrame("Perfect, I have arranged a callback for you. A member of our team will contact you shortly. Thank you for calling City Health Clinic!"),
        EndTaskFrame()
    ])
    return None, create_end_call_node()

arrange_callback_func = FlowsFunctionSchema(
    name="arrange_callback",
    handler=handle_arrange_callback,
    description="User agreed to arrange a callback from the clinic team.",
    properties={},
    required=[]
)

async def handle_doctor_info(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    return None, create_doctor_info_node()

doctor_info_func = FlowsFunctionSchema(
    name="doctor_info",
    handler=handle_doctor_info,
    description="User asks about which doctors are available or their specialties.",
    properties={},
    required=[]
)

async def handle_start_booking(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    state = flow_manager.state.get("booking_data", {})
    for k, v in args.items():
        if v: state[k] = v
    flow_manager.state.update({"booking_data": state})
    return None, create_gather_info_node(flow_manager.state.get("caller_phone", "Unknown"))

start_booking_func = FlowsFunctionSchema(
    name="start_booking",
    handler=handle_start_booking,
    description="User indicates intent to book an appointment.",
    properties={},
    required=[]
)

async def handle_check_slots(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    # Instantly output a filler speak frame to mask database/external api latency
    await flow_manager.worker.queue_frames([
        TTSSpeakFrame("Let me check the available timings for you...")
    ])
    
    date = args.get("date")
    spec = args.get("specialization", "General")
    docs = await get_doctors()
    doc_list = docs.get("doctors") or []
    
    doc_id = 1
    if doc_list:
        doc_id = doc_list[0].get("id", 1) # Default to first
        for d in doc_list:
            if spec and spec.lower() in (d.get("specialization") or "").lower():
                doc_id = d.get("id", 1)
                break
                
    
    slots = await get_available_slots(doc_id, date)
    available = slots.get("available_slots", [])
    
    # Proactive slot lookahead logic
    alternative_slots = {}
    if not available:
        logger.info(f"No slots available on {date}. Looking ahead...")
        import datetime
        try:
            current_date = datetime.datetime.strptime(date, "%Y-%m-%d")
            # Look ahead up to 3 days
            for i in range(1, 4):
                next_date_str = (current_date + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
                next_slots = await get_available_slots(doc_id, next_date_str)
                next_available = next_slots.get("available_slots", [])
                if next_available:
                    alternative_slots[next_date_str] = next_available
                    logger.info(f"Found alternative slots on {next_date_str}: {next_available}")
                    break
        except Exception as e:
            logger.error(f"Error checking alternative slots: {e}")
    
    state = flow_manager.state.get("booking_data", {})
    state["date"] = date
    state["specialization"] = spec
    state["doctor_id"] = doc_id
    state["available_slots"] = available
    state["alternative_slots"] = alternative_slots
    flow_manager.state.update({"booking_data": state})
    
    return None, create_gather_info_node(
        flow_manager.state.get("caller_phone", "Unknown"),
        target_date=date,
        available_slots=available,
        alternative_slots=alternative_slots
    )

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

async def handle_book_appointment(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    state = flow_manager.state.get("booking_data", {})
    for k, v in args.items():
        if v: state[k] = v
    flow_manager.state.update({"booking_data": state})
    return None, create_confirm_booking_node()

async def handle_confirm_details(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
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
    args = args or {}
    state = flow_manager.state.get("booking_data", {})
    try:
        res = await book_appointment(
            state.get("doctor_id", 1),
            state.get("date"),
            state.get("time"),
            state.get("patient_name"),
            state.get("patient_phone")
        )
        if "error" in res or not res.get("success", False):
            logger.error("Booking API returned error: " + str(res))
            return None, create_booking_error_node()
    except Exception as e:
        logger.error(f"Failed to book appointment: {e}")
        return None, create_booking_error_node()
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

VOICE RESPONSE RULES (CRITICAL):
- Maximum 1-2 sentences per response. Shorter is always better.
- Ask exactly ONE question OR give one piece of information per turn—never both.
- Forbid patronizing phrases: never say "great question", "lovely question", "no problem", or "no worries".
- Standardize natural warm acknowledgements: use "Of course", "Sure", "Let me check" sparingly.

GUARDRAILS:
- We CANNOT provide medical advice, diagnosis, or treatments. If requested, politely inform them of this limit and offer to arrange a callback from our team.
- If they ask for medical advice, live transfer, or have an urgent emergency, call the `urgent_case` function.

ACTIONS:
- User wants to book: call `start_booking`
- User has emergency or requests live transfer/medical advice: call `urgent_case`
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
- Dr. Davis (Pediatrics)
- Dr. Jones (Cardiology)

Ask if they want to book an appointment with one of them.
IF yes -> call `start_booking`.
"""
            }
        ],
        functions=[start_booking_func, urgent_case_func, end_call_func]
    )

def create_gather_info_node(caller_phone: str = "Unknown", target_date: str = None, available_slots: list = None, alternative_slots: dict = None) -> NodeConfig:
    phone_prompt = ""
    if caller_phone and caller_phone != "Unknown":
        last_3 = caller_phone[-3:]
        digit_map = {'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine'}
        last_3_spoken = '-'.join([digit_map.get(d, d) for d in last_3])
        phone_prompt = f"When asking for the patient phone number, you already have the caller's phone number ({caller_phone}). Format it clearly for TTS and ask: 'Should I take the phone number ending in {last_3_spoken} for your appointment?' If yes, use {caller_phone} as the phone number."

    # Pre-calculate relative dates in python to prevent LLM reasoning errors
    import datetime
    from zoneinfo import ZoneInfo
    now_ist = dt.now(ZoneInfo("Asia/Kolkata"))
    
    today_str = now_ist.strftime("%A, %B %d, %Y")
    
    tomorrow = now_ist + datetime.timedelta(days=1)
    tomorrow_str = tomorrow.strftime("%A, %B %d, %Y")
    
    day_after = now_ist + datetime.timedelta(days=2)
    day_after_str = day_after.strftime("%A, %B %d, %Y")
    
    # Calculate this Friday and next Friday
    today_wd = now_ist.weekday()
    days_to_friday = (4 - today_wd) % 7
    this_friday = now_ist + datetime.timedelta(days=days_to_friday)
    this_friday_str = this_friday.strftime("%A, %B %d, %Y")
    
    next_friday = this_friday + datetime.timedelta(days=7)
    next_friday_str = next_friday.strftime("%A, %B %d, %Y")
    
    days_to_saturday = (5 - today_wd) % 7
    this_saturday = now_ist + datetime.timedelta(days=days_to_saturday)
    this_saturday_str = this_saturday.strftime("%A, %B %d, %Y")
    
    next_saturday = this_saturday + datetime.timedelta(days=7)
    next_saturday_str = next_saturday.strftime("%A, %B %d, %Y")

    calendar_ref = f"""CALENDAR REFERENCE (Use this to resolve relative dates):
- Today: {today_str}
- Tomorrow: {tomorrow_str}
- Day after tomorrow: {day_after_str}
- This Friday: {this_friday_str}
- Next Friday: {next_friday_str}
- This Saturday: {this_saturday_str}
- Next Saturday: {next_saturday_str}"""

    slots_prompt = ""
    if available_slots is not None:
        if available_slots:
            top_slots = available_slots[:4]
            slots_prompt = f"AVAILABLE SLOTS FOR {target_date}: {', '.join(top_slots)}. Offer ONLY these specific times to the user and ask which one they prefer. Do NOT list more than 4 times."
        else:
            alt_text = ""
            if alternative_slots:
                alt_text = " ".join([f"On {d}: {', '.join(s)}." for d, s in alternative_slots.items()])
            slots_prompt = f"Unfortunately, there are no available slots on {target_date}. However, alternative slots are: {alt_text}. Apologize and offer these alternatives to the user."

    return NodeConfig(
        name="gather_info",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are collecting details for an appointment.
{calendar_ref}
CLINIC HOURS: Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 4:00 PM, Sunday Closed.
REQUIRED DETAILS: Date, Specialization, Time, Patient Name, Patient Phone.

VOICE RESPONSE RULES:
- Maximum 1-2 sentences per response. Shorter is always better.
- Ask exactly ONE question at a time. Never ask for two things at once.
- Tone check: Never say "great question", "no problem", "no worries". Speak naturally using "Sure", "Of course", "Let me check".

FLOW & SUGGESTIONS:
1. First, establish Date and Specialization. If missing, ask for them ONE BY ONE. DO NOT suggest a specific date like Saturday unless the user has already mentioned it.
2. Resolve Date Ambiguity: If they say an ambiguous date like "this Tuesday", verify: "Did you mean this Tuesday the [date] or next Tuesday the [date]?"
3. Date Lookup: When the user specifies a date, resolve it using the CALENDAR REFERENCE. DO NOT quiz the user or ask math/day questions. 
4. Check Slots: Once the date is resolved, IMMEDIATELY call the `check_slots` function to get available times for that Date. DO NOT output the tool call as text or tags like <function>. Use the native tool call interface.
5. Once check_slots has run, look at the AVAILABLE SLOTS provided. Offer the slots and ask for their preferred Time.
   - Closing warning: If the requested booking time is within 30 minutes of closing (e.g., 5:30 PM on weekdays or 3:30 PM on Saturdays), warn the user: "Just so you're aware, our clinic closes at [closing_time] so the doctor would need to complete the session by then."
6. After Time, ask for Patient Name.
   - Validation: Full name only (First + Last). If they give first name only, ask: "And your surname?"
   - If name is complex, unusual, or easy to misspell, ask the patient to confirm the spelling.
7. After Patient Name, ask for Patient Phone.
8. Optional Preference Check: Ask exactly one optional question: "Will this be your first time visiting our clinic, or do you have any specific symptoms you'd like the doctor to know about in advance?"
9. Once ALL details are gathered, call `confirm_details`.

{slots_prompt}

{phone_prompt}

CRITICAL RULES:
- If the user says "sorry", "again", "what", or seems confused, REPEAT the exact last question you asked.
- When asking the patient to confirm details or verifying the phone number, format the phone number using hyphens or spaces to ensure the TTS reads it out in chunks with pauses (e.g., '9 8 7... 6 5 4... 3 2 1 0' instead of '9876543210').
- Guardrail: If user asks for medical advice, diagnoses, treatments, or live transfer, call `urgent_case`.
"""
            }
        ],
        functions=[check_slots_func, confirm_details_func, urgent_case_func, end_call_func, start_booking_func]
    )

def create_confirm_booking_node() -> NodeConfig:
    return NodeConfig(
        name="confirm_booking",
        task_messages=[
            {
                "role": "system",
                "content": """Recap the booking details to the patient.
"Just to confirm, I have you down for an appointment on [Date] at [Time] for [Specialization], under the name [Patient Name] at [Phone]. Is that correct?"
Note: When confirming the phone number, read it slowly and format it with hyphens or spaces (e.g. '9 8 7... 6 5 4... 3 2 1 0') so the TTS pauses between chunks.

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
                "content": """Politely say to the user: "I understand. I cannot provide medical advice or transfer the call directly, but I can arrange a call back from our medical team. Would you like me to do that?"
Wait for user response.
IF YES -> call `arrange_callback`.
IF NO -> call `start_booking` to return to booking, or call `end_call` if they wish to hang up.
"""
            }
        ],
        functions=[arrange_callback_func, start_booking_func, end_call_func]
    )

def create_booking_error_node() -> NodeConfig:
    return NodeConfig(
        name="booking_error",
        task_messages=[
            {
                "role": "system",
                "content": """The booking system is currently experiencing issues.
Politely say: "I'm sorry, there seems to be a temporary issue with our booking system. I have noted down all your details manually, and our reception team will contact you shortly to confirm everything."
Then call `end_call`."""
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

async def run_bot(websocket_client: WebSocket, stream_sid: str, call_sid: str, caller_phone: str = "Unknown", testing: bool = False):
    async with aiohttp.ClientSession() as session:
        serializer = TwilioFrameSerializer(
            stream_sid=stream_sid,
            call_sid=call_sid,
            account_sid=os.getenv("TWILIO_ACCOUNT_SID", ""),
            auth_token=os.getenv("TWILIO_AUTH_TOKEN", ""),
        )

        transport = FastAPIWebsocketTransport(
            websocket=websocket_client,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                add_wav_header=False,
                vad_analyzer=SileroVADAnalyzer(params=VADParams(start_secs=0.15, stop_secs=0.3, confidence=0.45)),
                serializer=serializer,
            ),
        )

        stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
        tts = CartesiaTTSService(api_key=os.getenv("CARTESIA_API_KEY"), voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22")
        llm = OpenAILLMService(api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1", model="llama-3.3-70b-versatile")

        context = LLMContext(
            messages=[]
        )
        context_aggregator = LLMContextAggregatorPair(context)
        transcript_processor = TranscriptProcessor(context, lambda: task)

        assistant_monitor = AssistantSpeechMonitor(transcript_processor)

        pipeline = Pipeline([
            transport.input(),
            stt,
            transcript_processor,
            context_aggregator.user(),
            llm,
            tts,
            assistant_monitor,
            transport.output(),
            context_aggregator.assistant(),
        ])

        task = PipelineTask(pipeline, params=PipelineParams(
            audio_in_sample_rate=8000,
            allow_interruptions=True
        ))

        # Initialize FlowManager
        flow_manager = FlowManager(
            llm=llm,
            context_aggregator=context_aggregator,
            worker=task,
        )

        flow_manager.state["caller_phone"] = caller_phone

        # FlowManager manages context
        await flow_manager.initialize(create_initial_node())

        call_info = {"start_time": None, "end_time": None}

        @transport.event_handler("on_client_connected")
        async def on_client_connected(transport, client):
            transcript_processor.start_timeout_monitoring()
            call_info["start_time"] = dt.utcnow().isoformat() + "Z"
            
            ist_time = dt.now(ZoneInfo("Asia/Kolkata"))
            hour = ist_time.hour
            if hour < 12:
                time_of_day = "Morning"
            elif hour < 17:
                time_of_day = "Afternoon"
            else:
                time_of_day = "Evening"
            
            # Trigger the LLM to speak first.
            greeting = f"Good {time_of_day}, This is {CLINIC_NAME}, I'm Aria. How can I help you today."
            # Add greeting directly to context and TTS
            await task.queue_frames([TTSSpeakFrame(greeting)])
            await task.queue_frames([LLMMessagesAppendFrame(messages=[{"role": "assistant", "content": greeting}])])

        @transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport, client):
            transcript_processor.stop_monitoring()
            call_info["end_time"] = dt.utcnow().isoformat() + "Z"
            logger.info("Twilio client disconnected. Sending transcript to backend...")
            transcript = transcript_processor.get_transcript()
            payload = {
                "call_id": call_sid, # use call_sid as ID since Daily participant ID is gone
                "caller_phone": caller_phone,
                "transcript": transcript,
                "start_time": call_info["start_time"],
                "end_time": call_info["end_time"],
            }
            try:
                headers = {"x-bot-api-key": os.getenv("BOT_API_KEY")}
                async with session.post(f"{BACKEND_URL}/calls/ingest", json=payload, headers=headers) as resp:
                    logger.info(f"Backend ingest status: {resp.status}")
            except Exception as e:
                logger.error(f"Failed to ingest to backend: {e}")
            await task.cancel()

        runner = PipelineRunner(handle_sigint=False, force_gc=True)
        await runner.run(task)
