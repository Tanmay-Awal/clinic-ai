import asyncio
import os
import sys
import json
import time
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
    BotStartedSpeakingFrame, BotStoppedSpeakingFrame,
    OutputAudioRawFrame, InputAudioRawFrame
)
import wave
from pipecat_flows import FlowManager, NodeConfig, FlowsFunctionSchema, FlowArgs
from tools import get_clinic_context, get_doctors, get_available_slots, book_appointment, ingest_call
from runtime import (
    classify_intent,
    ensure_runtime_state,
    mark_fallback,
    note_interruption,
    note_silence_prompt,
    normalize_phone_for_tts,
    normalize_time_for_tts,
    render_clinic_context,
    record_external_call,
    summarize_call,
    update_stage,
)

load_dotenv()
logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001/api")
CLINIC_NAME = "City Health Clinic"

class LocalAudioRecorder(FrameProcessor):
    def __init__(self, call_id: str):
        super().__init__()
        rec_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'clinic-backend', 'public', 'recordings'))
        os.makedirs(rec_dir, exist_ok=True)
        
        self.filepath = os.path.join(rec_dir, f"{call_id}.wav")
        self.wav_file = wave.open(self.filepath, 'wb')
        self.wav_file.setnchannels(1)
        self.wav_file.setsampwidth(2)
        self.wav_file.setframerate(16000)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, OutputAudioRawFrame) or isinstance(frame, InputAudioRawFrame):
            self.wav_file.writeframes(frame.audio)

    async def cleanup(self):
        if self.wav_file:
            self.wav_file.close()
            self.wav_file = None

class TranscriptProcessor(FrameProcessor):
    def __init__(self, context: LLMContext, runtime_state: dict, task_getter=None):
        super().__init__()
        self._context = context
        self.runtime_state = runtime_state
        self.last_interaction_time = asyncio.get_event_loop().time()
        self.task_getter = task_getter
        self.timeout_task = None
        self.is_running = True
        self._last_user_text = ""

    def start_timeout_monitoring(self):
        self.last_interaction_time = asyncio.get_event_loop().time()
        self.timeout_task = asyncio.create_task(self._monitor_silence())

    async def _monitor_silence(self):
        while self.is_running:
            await asyncio.sleep(1)
            now = asyncio.get_event_loop().time()
            if now - self.last_interaction_time > 8:
                # Reset interaction time to avoid spamming
                self.last_interaction_time = now
                if self.task_getter:
                    task = self.task_getter()
                    if task:
                        note_silence_prompt(self.runtime_state)
                        logger.info("Silence detected. Prompting user...")
                        await task.queue_frames([TTSSpeakFrame("Are you still there?")])

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)

        # Reset timeout on user speech/bot speech events
        if isinstance(frame, (UserStartedSpeakingFrame, UserSpeakingFrame, TranscriptionFrame,
                              BotStartedSpeakingFrame, BotStoppedSpeakingFrame, TTSSpeakFrame)):
            self.last_interaction_time = asyncio.get_event_loop().time()

        if isinstance(frame, UserStartedSpeakingFrame):
            note_interruption(self.runtime_state)

        if isinstance(frame, TranscriptionFrame):
            text = getattr(frame, "text", "") or getattr(frame, "transcript", "") or ""
            if text and text != self._last_user_text:
                self._last_user_text = text
                self.runtime_state["last_user_text"] = text
                intent = classify_intent(text, self.runtime_state)
                self.runtime_state["intent"] = intent.intent
                self.runtime_state["intent_confidence"] = intent.confidence
                self.runtime_state["intent_hint"] = intent.fallback_hint

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
        if isinstance(frame, BotStartedSpeakingFrame):
            self.processor_to_reset.runtime_state["assistant_speaking"] = True
        if isinstance(frame, BotStoppedSpeakingFrame):
            self.processor_to_reset.runtime_state["assistant_speaking"] = False


# ==================== TOOL HANDLERS ====================


def get_runtime(flow_manager: FlowManager) -> dict:
    return flow_manager.state.get("runtime", {})


def get_context_snapshot(flow_manager: FlowManager) -> dict:
    runtime = get_runtime(flow_manager)
    return runtime.get("context_snapshot") or {}


def update_booking_state(flow_manager: FlowManager, **kwargs):
    runtime = get_runtime(flow_manager)
    booking_state = flow_manager.state.get("booking_data", {})
    for key, value in kwargs.items():
        if value is not None and value != "":
            booking_state[key] = value
    flow_manager.state["booking_data"] = booking_state
    runtime["booking_data"] = booking_state
    return booking_state


def build_context_summary(snapshot: dict) -> str:
    if not snapshot:
        return ""
    return render_clinic_context(snapshot)


def build_confirmation_phone(phone: str) -> str:
    return normalize_phone_for_tts(phone)


def build_summary_payload(flow_manager: FlowManager, context_snapshot: dict) -> dict:
    runtime = get_runtime(flow_manager)
    transcript = flow_manager.state.get("_transcript", [])
    summary_payload = summarize_call(runtime, transcript, context_snapshot)
    runtime["summary_payload"] = summary_payload
    return summary_payload

async def handle_end_call(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    update_stage(get_runtime(flow_manager), "end_call")
    await flow_manager.worker.queue_frames([
        TTSSpeakFrame("Thank you for calling City Health Clinic. Have a wonderful day!"),
        EndTaskFrame()
    ])
    return None, create_end_call_node(get_context_snapshot(flow_manager))

end_call_func = FlowsFunctionSchema(
    name="end_call",
    handler=handle_end_call,
    description="User wants to end the call.",
    properties={},
    required=[]
)

async def handle_urgent_case(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    update_stage(get_runtime(flow_manager), "urgent_case")
    return None, create_urgent_case_node(get_context_snapshot(flow_manager))

urgent_case_func = FlowsFunctionSchema(
    name="urgent_case",
    handler=handle_urgent_case,
    description="GLOBAL CONDITION: User mentions emergency, severe pain, medical advice, live transfer, or urgent care.",
    properties={},
    required=[]
)

async def handle_arrange_callback(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    update_stage(get_runtime(flow_manager), "callback_arranged")
    await flow_manager.worker.queue_frames([
        TTSSpeakFrame("Perfect, I have arranged a callback for you. A member of our team will contact you shortly. Thank you for calling City Health Clinic!"),
        EndTaskFrame()
    ])
    return None, create_end_call_node(get_context_snapshot(flow_manager))

arrange_callback_func = FlowsFunctionSchema(
    name="arrange_callback",
    handler=handle_arrange_callback,
    description="User agreed to arrange a callback from the clinic team.",
    properties={},
    required=[]
)

async def handle_doctor_info(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    update_stage(get_runtime(flow_manager), "doctor_info")
    return None, create_doctor_info_node(get_context_snapshot(flow_manager))

doctor_info_func = FlowsFunctionSchema(
    name="doctor_info",
    handler=handle_doctor_info,
    description="User asks about which doctors are available or their specialties.",
    properties={},
    required=[]
)

async def handle_start_booking(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    runtime = get_runtime(flow_manager)
    update_stage(runtime, "booking")
    state = update_booking_state(flow_manager, **args)
    runtime["intent"] = runtime.get("intent") or "booking"
    if state.get("date"):
        runtime["selected_date"] = state["date"]
    return None, create_gather_info_node(
        caller_phone=flow_manager.state.get("caller_phone", "Unknown"),
        context_snapshot=get_context_snapshot(flow_manager),
        runtime_state=runtime,
    )

start_booking_func = FlowsFunctionSchema(
    name="start_booking",
    handler=handle_start_booking,
    description="User indicates intent to book an appointment.",
    properties={},
    required=[]
)

async def handle_check_slots(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    runtime = get_runtime(flow_manager)
    update_stage(runtime, "slot_lookup")
    await flow_manager.worker.queue_frames([TTSSpeakFrame("Let me check the available timings for you...")])

    date = args.get("date")
    spec = args.get("specialization", "General")
    snapshot = get_context_snapshot(flow_manager)
    if not snapshot or snapshot.get("date") != date:
        snapshot = await get_clinic_context(date=date, days_ahead=3, refresh=False)
        runtime["context_snapshot"] = snapshot

    availability = snapshot.get("availability", [])
    chosen = None
    for doctor in availability:
        doctor_spec = (doctor.get("specialization") or "").lower()
        if not spec or spec.lower() in doctor_spec:
            chosen = doctor
            if doctor.get("available_slots"):
                break
    if not chosen and availability:
        chosen = availability[0]

    available = (chosen or {}).get("available_slots", [])
    alternative_slots = (chosen or {}).get("alternative_slots", {})
    if not available and snapshot.get("next_best_dates"):
        alternative_slots = snapshot.get("next_best_dates", {})

    update_booking_state(
        flow_manager,
        date=date,
        specialization=spec,
        doctor_id=(chosen or {}).get("doctor_id", 1),
        available_slots=available,
        alternative_slots=alternative_slots,
    )

    return None, create_gather_info_node(
        flow_manager.state.get("caller_phone", "Unknown"),
        target_date=date,
        available_slots=available,
        alternative_slots=alternative_slots,
        context_snapshot=snapshot,
        runtime_state=runtime,
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
    update_stage(get_runtime(flow_manager), "booking_recap")
    update_booking_state(flow_manager, **args)
    return None, create_confirm_booking_node(get_context_snapshot(flow_manager), get_runtime(flow_manager))

async def handle_confirm_details(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    update_stage(get_runtime(flow_manager), "booking_recap")
    update_booking_state(flow_manager, **args)
    return None, create_confirm_booking_node(get_context_snapshot(flow_manager), get_runtime(flow_manager))

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
    runtime = get_runtime(flow_manager)
    update_stage(runtime, "finalizing_booking")
    state = flow_manager.state.get("booking_data", {})
    try:
        summary_payload = build_summary_payload(flow_manager, get_context_snapshot(flow_manager))
        runtime["booking_result"] = {}
        res = await book_appointment(
            state.get("doctor_id", 1),
            state.get("date"),
            state.get("time"),
            state.get("patient_name"),
            state.get("patient_phone"),
            conversation_state=summary_payload.get("conversation_state", {}),
            telemetry=summary_payload.get("telemetry", {}),
            call_summary=summary_payload.get("call_summary", ""),
            intent=summary_payload.get("intent", ""),
            context_snapshot=get_context_snapshot(flow_manager),
        )
        if "error" in res or not res.get("success", False):
            logger.error("Booking API returned error: " + str(res))
            mark_fallback(runtime, "booking_failed")
            return None, create_booking_error_node(get_context_snapshot(flow_manager), runtime)
        runtime["booking_result"] = res
    except Exception as e:
        logger.error(f"Failed to book appointment: {e}")
        mark_fallback(runtime, "booking_exception")
        return None, create_booking_error_node(get_context_snapshot(flow_manager), runtime)
    return None, create_success_node(get_context_snapshot(flow_manager), runtime)

finalize_booking_func = FlowsFunctionSchema(
    name="finalize_booking",
    handler=handle_finalize_booking,
    description="User has confirmed the booking recap. Proceed to book in DB.",
    properties={},
    required=[]
)

# ==================== NODE DEFINITIONS ====================

def create_initial_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    context_block = build_context_summary(context_snapshot or {})
    intent_hint = (runtime_state or {}).get("intent_hint", "")
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

CLINIC SNAPSHOT:
{context_block}

INTENT HINT:
{intent_hint or 'None yet'}
"""
            }
        ],
        functions=[start_booking_func, urgent_case_func, doctor_info_func, end_call_func]
    )

def create_doctor_info_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    context_block = build_context_summary(context_snapshot or {})
    return NodeConfig(
        name="doctor_info",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are answering questions about doctors.
Current clinic snapshot:
{context_block}

Ask if they want to book an appointment with one of them.
IF yes -> call `start_booking`.
"""
            }
        ],
        functions=[start_booking_func, urgent_case_func, end_call_func]
    )

def create_gather_info_node(
    caller_phone: str = "Unknown",
    target_date: str = None,
    available_slots: list = None,
    alternative_slots: dict = None,
    context_snapshot: dict | None = None,
    runtime_state: dict | None = None,
) -> NodeConfig:
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

    context_block = build_context_summary(context_snapshot or {})
    intent_hint = (runtime_state or {}).get("intent_hint", "")

    return NodeConfig(
        name="gather_info",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are collecting details for an appointment.
{calendar_ref}
CLINIC SNAPSHOT:
{context_block}
INTENT HINT:
{intent_hint or 'None'}
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

def create_confirm_booking_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    booking_data = (runtime_state or {}).get("booking_data", {})
    return NodeConfig(
        name="confirm_booking",
        task_messages=[
            {
                "role": "system",
                "content": f"""Recap the booking details to the patient.
"Just to confirm, I have you down for an appointment on {booking_data.get('date', '[Date]')} at {normalize_time_for_tts(str(booking_data.get('time', '[Time]')))} for {booking_data.get('specialization', '[Specialization]')}, under the name {booking_data.get('patient_name', '[Patient Name]')} at {build_confirmation_phone(str(booking_data.get('patient_phone', '[Phone]')))}. Is that correct?"
Note: When confirming the phone number, read it slowly and format it with spaces so the TTS pauses between chunks.

IF YES -> call `finalize_booking`.
IF NO -> call `start_booking` to modify.
"""
            }
        ],
        functions=[finalize_booking_func, start_booking_func, end_call_func]
    )

def create_success_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
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

def create_urgent_case_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
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

def create_booking_error_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
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

def create_end_call_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
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
            vad_analyzer=SileroVADAnalyzer(params=VADParams(start_secs=0.08, stop_secs=0.18, confidence=0.5)),
            serializer=serializer,
        ),
    )

    stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
    tts = CartesiaTTSService(api_key=os.getenv("CARTESIA_API_KEY"), voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22")
    llm = OpenAILLMService(api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1", model="llama-3.3-70b-versatile")

    context = LLMContext(messages=[])
    context_aggregator = LLMContextAggregatorPair(context)

    runtime_state = None
    context_snapshot_task = asyncio.create_task(get_clinic_context(refresh=False))

    pipeline_placeholder = None
    task = None

    def task_getter():
        return task

    runtime_state = ensure_runtime_state({"caller_phone": caller_phone, "booking_data": {}}, caller_phone)
    transcript_processor = TranscriptProcessor(context, runtime_state, task_getter)
    assistant_monitor = AssistantSpeechMonitor(transcript_processor)

    recorder = LocalAudioRecorder(call_id=call_sid)

    pipeline = Pipeline([
        transport.input(),
        recorder,
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

    flow_manager = FlowManager(
        llm=llm,
        context_aggregator=context_aggregator,
        worker=task,
    )

    flow_manager.state["caller_phone"] = caller_phone
    flow_manager.state["booking_data"] = {}
    flow_manager.state["runtime"] = runtime_state
    runtime_state["caller_phone"] = caller_phone
    runtime_state["booking_data"] = flow_manager.state["booking_data"]
    try:
        runtime_state["context_snapshot"] = await context_snapshot_task
    except Exception as exc:
        logger.warning(f"Context prefetch failed, falling back to empty snapshot: {exc}")
        runtime_state["context_snapshot"] = {
            "clinic_name": CLINIC_NAME,
            "timezone": "UTC",
            "doctors": [],
            "availability": [],
            "best_matches": [],
            "clinic_hours": {},
            "next_best_dates": {},
        }

    await flow_manager.initialize(create_initial_node(runtime_state["context_snapshot"], runtime_state))

    call_info = {"start_time": None, "end_time": None}

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        transcript_processor.start_timeout_monitoring()
        call_info["start_time"] = dt.utcnow().isoformat() + "Z"
        update_stage(runtime_state, "greeting")

        ist_time = dt.now(ZoneInfo("Asia/Kolkata"))
        hour = ist_time.hour
        if hour < 12:
            time_of_day = "Morning"
        elif hour < 17:
            time_of_day = "Afternoon"
        else:
            time_of_day = "Evening"

        greeting = f"Good {time_of_day}, this is {CLINIC_NAME}. I'm Aria. How can I help you today?"
        runtime_state["last_bot_text"] = greeting
        await task.queue_frames([TTSSpeakFrame(greeting)])
        await task.queue_frames([LLMMessagesAppendFrame(messages=[{"role": "assistant", "content": greeting}])])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        transcript_processor.stop_monitoring()
        call_info["end_time"] = dt.utcnow().isoformat() + "Z"
        update_stage(runtime_state, "ended")
        logger.info("Twilio client disconnected. Sending transcript to backend...")

        transcript = transcript_processor.get_transcript()
        flow_manager.state["_transcript"] = transcript
        summary_payload = build_summary_payload(flow_manager, runtime_state.get("context_snapshot", {}))
        payload = {
            "call_id": call_sid,
            "caller_phone": caller_phone,
            "transcript": transcript,
            "start_time": call_info["start_time"],
            "end_time": call_info["end_time"],
            "call_status": "ended",
            "needs_ai_processing": True,
            "call_summary": summary_payload.get("call_summary", ""),
            "conversation_state": summary_payload.get("conversation_state", {}),
            "telemetry": summary_payload.get("telemetry", {}),
            "intent": summary_payload.get("intent", ""),
            "context_snapshot": runtime_state.get("context_snapshot", {}),
            "booking_result": runtime_state.get("booking_result", {}),
            "recording_url": f"{BACKEND_URL.replace('/api', '')}/public/recordings/{call_sid}.wav",
        }
        try:
            await ingest_call(payload)
            logger.info("Backend ingest completed")
        except Exception as e:
            logger.error(f"Failed to ingest to backend: {e}")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False, force_gc=True)
    await runner.run(task)
