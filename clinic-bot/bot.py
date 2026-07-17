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

# Initialize VAD analyzer globally to load Silero model at server startup
global_vad_analyzer = SileroVADAnalyzer(params=VADParams(start_secs=0.08, stop_secs=0.18, confidence=0.5))


class RotatedGroqLLMService(OpenAILLMService):
    def __init__(self, api_keys: list, *args, **kwargs):
        self.api_keys = [k for k in api_keys if k]
        self.current_key_idx = 0
        if not self.api_keys:
            raise ValueError("At least one Groq API key must be provided.")
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY")
        super().__init__(api_key=self.api_keys[0], *args, **kwargs)

    def _rotate_key(self):
        from openai import AsyncOpenAI
        self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
        next_key = self.api_keys[self.current_key_idx]
        logger.info(f"Rotating Groq API Key to key index {self.current_key_idx} (masked: ...{next_key[-6:] if len(next_key) > 6 else next_key})")
        # Properly recreate the underlying client so connection pools and headers update
        if hasattr(self, '_async_client'):
            self._async_client = AsyncOpenAI(api_key=next_key, base_url="https://api.groq.com/openai/v1")
        if hasattr(self, '_client'):
            self._client = AsyncOpenAI(api_key=next_key, base_url="https://api.groq.com/openai/v1")

    def _switch_to_openrouter(self):
        from openai import AsyncOpenAI
        logger.warning("Groq completely failed. Switching to OpenRouter as fallback...")
        self.model_name = "meta-llama/llama-3.3-70b-instruct"
        # In newer pipecat versions, the model might be in self._model or self.model_name. We set both.
        if hasattr(self, '_model'):
            self._model = "meta-llama/llama-3.3-70b-instruct"
        if hasattr(self, '_async_client'):
            self._async_client = AsyncOpenAI(api_key=self.openrouter_key, base_url="https://openrouter.ai/api/v1")
        if hasattr(self, '_client'):
            self._client = AsyncOpenAI(api_key=self.openrouter_key, base_url="https://openrouter.ai/api/v1")

    def _switch_to_groq(self):
        from openai import AsyncOpenAI
        logger.info("Restoring Groq as primary LLM service...")
        self.model_name = "llama-3.3-70b-versatile"
        if hasattr(self, '_model'):
            self._model = "llama-3.3-70b-versatile"
        next_key = self.api_keys[self.current_key_idx]
        if hasattr(self, '_async_client'):
            self._async_client = AsyncOpenAI(api_key=next_key, base_url="https://api.groq.com/openai/v1")
        if hasattr(self, '_client'):
            self._client = AsyncOpenAI(api_key=next_key, base_url="https://api.groq.com/openai/v1")

    async def get_chat_completions(self, context: LLMContext):
        # Optimize context messages for prefix stability and prompt caching
        original_messages = list(context.messages)
        
        system_msgs = [msg for msg in original_messages if msg.get("role") == "system"]
        other_msgs = [msg for msg in original_messages if msg.get("role") != "system"]
        
        # Keep only the core persona (first) and current active node prompt (last)
        active_systems = []
        if len(system_msgs) > 0:
            active_systems.append(system_msgs[0])
        if len(system_msgs) > 1:
            active_systems.append(system_msgs[-1])
            
        consolidated_content = "\n\n---\n\n".join([msg.get("content", "") for msg in active_systems])
        consolidated_system_msg = {
            "role": "system",
            "content": consolidated_content
        }
        
        # Clean up other messages to strip historical tool calls and responses.
        # This prevents OpenAI/Groq API validation errors when a tool is no longer registered in the current node.
        cleaned_other_msgs = []
        for msg in other_msgs:
            role = msg.get("role")
            if role in ["tool", "developer", "function"]:
                continue
            
            new_msg = dict(msg)
            if role == "assistant" and "tool_calls" in new_msg:
                new_msg = dict(new_msg)
                del new_msg["tool_calls"]
                # If the assistant message only contained tool_calls and had no content, skip it
                if not new_msg.get("content"):
                    continue
            
            cleaned_other_msgs.append(new_msg)
            
        # Re-assign the optimized list to context messages before calling API
        context.set_messages([consolidated_system_msg] + cleaned_other_msgs)

        max_retries = len(self.api_keys)
        try:
            for attempt in range(max_retries):
                try:
                    return await super().get_chat_completions(context)
                except Exception as e:
                    err_msg = str(e).lower()
                    is_429 = "rate limit" in err_msg or "429" in err_msg
                    is_restricted = "organization restricted" in err_msg or "organization_restricted" in err_msg
                    if (is_429 or is_restricted) and attempt < max_retries - 1:
                        logger.warning(f"Groq API Key index {self.current_key_idx} hit Rate Limit or Restriction. Retrying with next key...")
                        self._rotate_key()
                        await asyncio.sleep(0.5)
                        continue
                    elif (is_429 or is_restricted) and self.openrouter_key:
                        # Final attempt failed on Groq, try OpenRouter fallback
                        try:
                            self._switch_to_openrouter()
                            result = await super().get_chat_completions(context)
                            return result
                        except Exception as or_err:
                            logger.error(f"OpenRouter fallback also failed: {or_err}")
                            raise or_err
                        finally:
                            self._switch_to_groq()
                    else:
                        raise e
        finally:
            context.set_messages(original_messages)

# Initialize Groq Keys and LLM Service globally at server startup
_groq_keys = []
_primary_key = os.getenv("GROQ_API_KEY")
if _primary_key:
    _groq_keys.append(_primary_key)
for i in range(2, 10):
    _key = os.getenv(f"GROQ_API_KEY_{i}")
    if _key:
        _groq_keys.append(_key)

if not _groq_keys:
    logger.error("No GROQ_API_KEY found in environment variables!")
else:
    logger.info(f"Loaded {len(_groq_keys)} Groq API Keys globally for dynamic rotation.")

global_llm = RotatedGroqLLMService(
    api_keys=_groq_keys,
    base_url="https://api.groq.com/openai/v1",
    settings=RotatedGroqLLMService.Settings(model="llama-3.3-70b-versatile")
)

# Pre-load Local Smart Turn detector ONNX model at server startup
try:
    from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
    logger.info("Pre-loading Local Smart Turn detector model...")
    _ = LocalSmartTurnAnalyzerV3()
except Exception as e:
    logger.warning(f"Could not pre-load Local Smart Turn: {e}")


PRE_RENDERED_GREETINGS = {}

async def pre_render_all_greetings():
    import httpx
    global PRE_RENDERED_GREETINGS
    api_key = os.getenv("CARTESIA_API_KEY")
    if not api_key:
        logger.error("No CARTESIA_API_KEY found, cannot pre-render greetings.")
        return
        
    greetings = {
        "Morning": f"Good Morning, this is {CLINIC_NAME}. I'm Emily. How can I help you today?",
        "Afternoon": f"Good Afternoon, this is {CLINIC_NAME}. I'm Emily. How can I help you today?",
        "Evening": f"Good Evening, this is {CLINIC_NAME}. I'm Emily. How can I help you today?",
    }
    
    url = "https://api.cartesia.ai/tts/bytes"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Cartesia-Version": "2024-06-10",
        "Content-Type": "application/json",
    }
    
    for key, text in greetings.items():
        payload = {
            "model_id": "sonic-3.5",
            "transcript": text,
            "voice": {
                "mode": "id",
                "id": "79a125e8-cd45-4c13-8a67-188112f4dd22"
            },
            "output_format": {
                "container": "raw",
                "encoding": "pcm_s16le",
                "sample_rate": 16000
            }
        }
        try:
            logger.info(f"Pre-rendering {key} greeting...")
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    PRE_RENDERED_GREETINGS[key] = response.content
                    logger.info(f"Successfully pre-rendered {key} greeting ({len(response.content)} bytes).")
                else:
                    logger.error(f"Failed to pre-render {key} greeting: {response.text}")
        except Exception as e:
            logger.error(f"Error pre-rendering {key} greeting: {e}")


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
        await self.push_frame(frame, direction)
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
        if value is not None and value != "" and str(value).lower() != "null":
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
    
    # If they already gave date and specialization, we could skip nodes, but for strictness:
    # Always transition to gather_date first. The LLM will immediately call provide_date if it already knows it.
    return None, create_gather_date_node(get_context_snapshot(flow_manager), runtime)

start_booking_func = FlowsFunctionSchema(
    name="start_booking",
    handler=handle_start_booking,
    description="Call this ONLY when the user explicitly confirms they want to book or schedule a new appointment. DO NOT call this if the user is just saying hello, greeting you, or stating their name (e.g., 'My name is Lucy' or 'This is Lucy').",
    properties={},
    required=[]
)

async def handle_provide_date(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    date = args.get("date")
    update_booking_state(flow_manager, date=date)
    return None, create_gather_spec_node(get_context_snapshot(flow_manager), get_runtime(flow_manager))

provide_date_func = FlowsFunctionSchema(
    name="provide_date",
    handler=handle_provide_date,
    description="User provided the date for the appointment.",
    properties={"date": {"type": "string", "description": "YYYY-MM-DD"}},
    required=["date"]
)

async def handle_provide_specialization(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    spec = args.get("specialization", "General Practice")
    date = flow_manager.state.get("booking_data", {}).get("date")
    
    snapshot = get_context_snapshot(flow_manager)
    if not snapshot or snapshot.get("date") != date:
        snapshot = await get_clinic_context(date=date, days_ahead=3, refresh=False)
        get_runtime(flow_manager)["context_snapshot"] = snapshot

    availability = snapshot.get("availability", [])
    chosen = None
    
    # Check matching
    if spec and str(spec).lower() not in ["general", "general practice"]:
        spec_clean = str(spec).lower().strip().replace("dr.", "").replace("dr", "").strip()
        for doctor in availability:
            doctor_spec = (doctor.get("specialization") or "").lower()
            doctor_name = (doctor.get("name") or "").lower().replace("dr.", "").replace("dr", "").strip()
            if spec_clean in doctor_spec or spec_clean in doctor_name:
                chosen = doctor
                break
    
    if not chosen and availability:
        chosen = availability[0]
        spec = "General Practice"

    if chosen:
        await flow_manager.worker.queue_frames([TTSSpeakFrame("Let me check the available timings for you...")])

    available = (chosen or {}).get("available_slots", [])
    alternative_slots = (chosen or {}).get("alternative_slots", {})
    if not available and snapshot.get("next_best_dates") and chosen:
        alternative_slots = snapshot.get("next_best_dates", {})

    update_booking_state(
        flow_manager,
        specialization=spec,
        doctor_id=(chosen or {}).get("doctor_id", 1),
        available_slots=available,
        alternative_slots=alternative_slots,
    )

    return None, create_gather_time_node(get_context_snapshot(flow_manager), get_runtime(flow_manager))

provide_specialization_func = FlowsFunctionSchema(
    name="provide_specialization",
    handler=handle_provide_specialization,
    description="User provided the specialization or doctor name.",
    properties={"specialization": {"type": "string", "description": "Specialization or doctor name"}},
    required=["specialization"]
)

async def handle_select_time(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    cleaned_time = args.get("time")
    if cleaned_time and str(cleaned_time).lower() != "null":
        update_booking_state(flow_manager, time=cleaned_time)
    return None, create_gather_name_node(get_context_snapshot(flow_manager), get_runtime(flow_manager))

select_time_func = FlowsFunctionSchema(
    name="select_time",
    handler=handle_select_time,
    description="User selected a preferred time slot.",
    properties={"time": {"type": "string", "description": "e.g. 10:30"}},
    required=["time"]
)

async def handle_provide_patient_name(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    cleaned_name = args.get("patient_name")
    if cleaned_name and str(cleaned_name).lower() != "null":
        update_booking_state(flow_manager, patient_name=cleaned_name)
    return None, create_confirm_phone_node(flow_manager.state.get("caller_phone", "Unknown"), get_context_snapshot(flow_manager), get_runtime(flow_manager))

provide_patient_name_func = FlowsFunctionSchema(
    name="provide_patient_name",
    handler=handle_provide_patient_name,
    description="User provided the patient's full name.",
    properties={"patient_name": {"type": "string", "description": "Patient's full name"}},
    required=["patient_name"]
)

async def handle_verify_phone_number(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    phone = args.get("patient_phone")
    if phone and str(phone).lower() != "null":
        update_booking_state(flow_manager, patient_phone=phone)
    return None, create_gather_notes_node(get_context_snapshot(flow_manager), get_runtime(flow_manager))

verify_phone_number_func = FlowsFunctionSchema(
    name="verify_phone_number",
    handler=handle_verify_phone_number,
    description="Call this to confirm and save the patient's verified phone number.",
    properties={"patient_phone": {"type": "string", "description": "Verified phone number"}},
    required=["patient_phone"]
)

async def handle_provide_notes(args: FlowArgs, flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    args = args or {}
    notes = args.get("notes")
    if notes and str(notes).lower() not in ["null", "none", "no"]:
        update_booking_state(flow_manager, notes=notes)
    else:
        update_booking_state(flow_manager, notes="")
    return None, create_confirm_booking_node(get_context_snapshot(flow_manager), get_runtime(flow_manager))

provide_notes_func = FlowsFunctionSchema(
    name="provide_notes",
    handler=handle_provide_notes,
    description="User provided extra notes/comments, or said no.",
    properties={"notes": {"type": "string", "description": "Extra comments, or empty/no if none"}},
    required=["notes"]
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
            notes=state.get("notes"),
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
    just_cancelled = (runtime_state or {}).get("just_cancelled", False)
    
    if just_cancelled:
        instruction = "The user's appointment has just been successfully cancelled. State exactly: 'Your appointment has been successfully cancelled. Is there anything else I can help you with today?' and wait for the user to respond. DO NOT say anything else."
        runtime_state["just_cancelled"] = False
    else:
        instruction = "The greeting has just been played. Wait for user to speak. DO NOT greet again."

    return NodeConfig(
        name="initial",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are Emily, receptionist at {CLINIC_NAME}.
{instruction}

VOICE RESPONSE RULES (CRITICAL):
- Maximum 1-2 sentences per response. Shorter is always better.
- Ask exactly ONE question OR give one piece of information per turn—never both.
- Forbid patronizing phrases: never say \"great question\", \"lovely question\", \"no problem\", or \"no worries\".
- Standardize natural warm acknowledgements: use \"Of course\", \"Sure\", \"Let me check\" sparingly.

GUARDRAILS:
- We CANNOT provide medical advice, diagnosis, or treatments. If requested, politely inform them of this limit and offer to arrange a callback from our team.
- If they ask for medical advice, live transfer, or have an urgent emergency, call the `urgent_case` function.

ACTIONS:
- User EXPLICITLY CONFIRMS they want to book a new appointment (e.g., 'I want to book an appointment', 'Can you schedule a checkup?'): call `start_booking`. DO NOT call this if the user is merely introducing themselves, stating their name (e.g. 'This is Lucy'), or saying hello.
- User wants to check, modify, or cancel an existing appointment: call `start_appointment_lookup`.
- User has emergency or requests live transfer/medical advice: call `urgent_case`
- User asks about doctors: call `doctor_info`

CLINIC SNAPSHOT:
{context_block}

INTENT HINT:
{intent_hint or 'None yet'}
"""
            }
        ],
        functions=[start_booking_func, urgent_case_func, doctor_info_func, start_appointment_lookup_func, end_call_func],
        respond_immediately=False
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
IF the user EXPLICITLY CONFIRMS they want to book -> call `start_booking` (pass date and specialization if they mentioned them). DO NOT call `start_booking` when just asking if they want to book.
"""
            }
        ],
        functions=[start_booking_func, urgent_case_func, end_call_func, doctor_info_func]
    )

def create_gather_date_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    import datetime
    from zoneinfo import ZoneInfo
    now_ist = dt.now(ZoneInfo("Asia/Kolkata"))
    calendar_ref = f"""CALENDAR REFERENCE (Use this to resolve relative dates):
- Today: {now_ist.strftime("%A, %B %d, %Y")}
- Tomorrow: {(now_ist + datetime.timedelta(days=1)).strftime("%A, %B %d, %Y")}
- Day after tomorrow: {(now_ist + datetime.timedelta(days=2)).strftime("%A, %B %d, %Y")}
"""
    return NodeConfig(
        name="gather_date",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are collecting the DATE for the appointment.
{calendar_ref}

VOICE RESPONSE RULES:
- Ask exactly ONE short question: "What date would you like to book the appointment?"
- Resolve Date Ambiguity: ONLY if they say an ambiguous weekday like "this Tuesday", verify: "Did you mean this Tuesday the [date] or next Tuesday the [date]?"
- Do NOT ask for verification if they say "Tomorrow" or "Today" or provide an exact date. Accept it immediately.
- If the user asks a normal question, ANSWER their question directly. Do NOT call `provide_date` until they explicitly provide a date.
- Once the user explicitly states a date, call `provide_date`.
"""
            }
        ],
        functions=[provide_date_func, urgent_case_func, end_call_func, doctor_info_func]
    )

def create_gather_spec_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    return NodeConfig(
        name="gather_spec",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are collecting the SPECIALIZATION for the appointment.

VOICE RESPONSE RULES:
- State exactly: "We offer General Practice, Pediatrics, and Dermatology. Which would you prefer?"
- If the user asks a question (e.g. "What is General Practice?"), ANSWER their question directly. Do NOT call `provide_specialization`.
- If the user provides an out of the box specialization (e.g. Neurology), politely accept it (the system will default it to General Practice internally).
- If the user provides a specific doctor's name, accept it.
- ONLY when they explicitly choose or state a specialization/doctor, immediately call `provide_specialization`.
"""
            }
        ],
        functions=[provide_specialization_func, urgent_case_func, end_call_func, doctor_info_func]
    )

def create_gather_time_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    state_data = (runtime_state or {}).get("booking_data", {})
    available_slots = state_data.get("available_slots", [])
    target_date = state_data.get("date", "")
    
    if available_slots:
        slots_prompt = f"AVAILABLE SLOTS FOR {target_date}: {', '.join(available_slots[:4])}. State these times to the user directly without any intro phrasing like 'let me check', because you just checked. Just say: 'We have {', '.join(available_slots[:4])}. Which one works best for you?'"
    else:
        slots_prompt = f"Unfortunately, there are no available slots on {target_date}. Apologize and ask them to pick another date (call `start_booking` to restart)."

    return NodeConfig(
        name="gather_time",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are collecting the TIME for the appointment.
{slots_prompt}

VOICE RESPONSE RULES:
- Offer ONLY the specific times listed.
- If the user selects a time NOT in the list, politely acknowledge and say it's not available, and ask them to choose from the given options.
- If the user asks a normal question, ANSWER their question directly. Do NOT call `select_time` until they choose a valid time.
- Once they select a valid time, immediately call `select_time`.
"""
            }
        ],
        functions=[select_time_func, start_booking_func, urgent_case_func, end_call_func, doctor_info_func]
    )

def create_gather_name_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    return NodeConfig(
        name="gather_name",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are collecting the PATIENT'S FULL NAME.
Ask: "Can I have your full name for the booking?"
- If the user asks a normal question, ANSWER their question directly. Do NOT call `provide_patient_name` until they provide their name.
Once provided, call `provide_patient_name`.
"""
            }
        ],
        functions=[provide_patient_name_func, urgent_case_func, end_call_func, doctor_info_func]
    )

def create_confirm_phone_node(caller_phone: str = "Unknown", context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    if caller_phone and caller_phone != "Unknown":
        last_3 = caller_phone[-3:]
        digit_map = {'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine'}
        last_3_spoken = ' - '.join([digit_map.get(d, d) for d in last_3])
        phone_prompt = f"Ask the user: 'Should I take the phone number ending in {last_3_spoken} for your appointment?'"
    else:
        phone_prompt = "Ask the user for their preferred contact phone number for the appointment."

    return NodeConfig(
        name="confirm_phone",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are verifying the phone number.
{phone_prompt}

If the user confirms, call `verify_phone_number` with `{caller_phone}`.
If the user wants a different number, ask for it, then call `verify_phone_number` with their number.
- If the user asks a normal question, ANSWER their question directly. Do NOT call `verify_phone_number` until the number is confirmed or provided.
"""
            }
        ],
        functions=[verify_phone_number_func, urgent_case_func, end_call_func, doctor_info_func]
    )

def create_gather_notes_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    return NodeConfig(
        name="gather_notes",
        task_messages=[
            {
                "role": "system",
                "content": f"""You are asking for EXTRA NOTES.
Ask exactly: "Is there any extra thing which you would like the doctor to know?"

If the user says No or nothing, call `provide_notes` with notes="".
If the user provides notes, call `provide_notes` with their comments.
- If the user asks a normal question, ANSWER their question directly. Do NOT call `provide_notes` until they answer the notes question.
"""
            }
        ],
        functions=[provide_notes_func, urgent_case_func, end_call_func, doctor_info_func]
    )

def create_confirm_booking_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    booking_data = (runtime_state or {}).get("booking_data", {})
    phone = str(booking_data.get('patient_phone', 'Unknown'))
    if phone != 'Unknown' and len(phone) >= 3:
        last_3 = phone[-3:]
        digit_map = {'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine'}
        phone_spoken = ' - '.join([digit_map.get(d, d) for d in last_3])
    else:
        phone_spoken = phone
        
    notes = booking_data.get('notes', '')
    notes_phrase = f" with the note: '{notes}'," if notes and str(notes).lower() not in ['null', 'no', 'none'] else ""

    return NodeConfig(
        name="confirm_booking",
        task_messages=[
            {
                "role": "system",
                "content": f"""Recap the booking details to the patient STRICTLY in this format:
"Just to confirm, I have you down for an appointment with {booking_data.get('doctor_id', 'our doctor')} for {booking_data.get('specialization', 'General Practice')} on {booking_data.get('date', '[Date]')} at {normalize_time_for_tts(str(booking_data.get('time', '[Time]')))}{notes_phrase} with phone number ending in {phone_spoken}. Is that correct?"

IF YES -> call `finalize_booking`.
IF NO -> call `start_booking` to modify.
"""
            }
        ],
        functions=[finalize_booking_func, start_booking_func, end_call_func, doctor_info_func, urgent_case_func]
    )


def create_success_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    return NodeConfig(
        name="success",
        task_messages=[
            {
                "role": "system",
                "content": """The appointment has been booked.
Say: "Perfect! Your appointment is successfully booked. We will send you an SMS confirmation shortly. Is there anything else I can assist you with?"

CRITICAL ROUTING RULES:
1. If the user says "No", "Nothing else", "That's all", or indicates they have no more questions -> call `end_call`.
2. If the user says "Yes" or indicates they want to ask a question -> DO NOT call `end_call`. Instead, politely ask: "Sure, what would you like to know?" and answer their question directly.
3. If they ask about doctor timings or details -> call `doctor_info`.
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
        functions=[arrange_callback_func, start_booking_func, end_call_func, doctor_info_func]
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
        functions=[end_call_func, doctor_info_func]
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
        functions=[doctor_info_func]
    )



# ==================== EXISTING APPOINTMENT CHECK FLOW ====================

async def handle_start_appointment_lookup(args, flow_manager):
    runtime = get_runtime(flow_manager)
    update_stage(runtime, "appointment_lookup")
    return None, create_gather_lookup_phone_node(get_context_snapshot(flow_manager), runtime)

start_appointment_lookup_func = FlowsFunctionSchema(
    name="start_appointment_lookup",
    handler=handle_start_appointment_lookup,
    description="User wants to check, modify, or cancel an existing appointment.",
    properties={},
    required=[]
)

def create_gather_lookup_phone_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    caller_phone = str((runtime_state or {}).get("caller_phone", "Unknown"))
    
    if caller_phone != 'Unknown' and len(caller_phone) >= 3:
        last_3 = caller_phone[-3:]
        digit_map = {'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine'}
        phone_spoken = ' - '.join([digit_map.get(d, d) for d in last_3])
    else:
        phone_spoken = caller_phone

    return NodeConfig(
        name="gather_lookup_phone",
        task_messages=[
            {
                "role": "system",
                "content": f"You are looking up the user's appointment. Ask exactly ONE short question: 'Is the appointment under the same phone number you are calling from, which ends in {phone_spoken}?' If they say yes, call provide_lookup_phone with this number ({caller_phone}). If they say no, ask for the full phone number they used."
            }
        ],
        functions=[provide_lookup_phone_func, start_appointment_lookup_func, start_booking_func, urgent_case_func, doctor_info_func, end_call_func]
    )

async def handle_provide_lookup_phone(args, flow_manager):
    phone = args.get("phone")
    runtime = get_runtime(flow_manager)
    runtime["lookup_phone"] = phone
    
    from tools import lookup_appointments
    appointments = await lookup_appointments(phone)
    runtime["existing_appointments"] = appointments
    
    if not appointments:
        await flow_manager.worker.queue_frames([TTSSpeakFrame("I cannot find any appointments linked with the phone number you provided. Is there any other phone number you might have used to book the appointment?")])
        return None, create_initial_node(get_context_snapshot(flow_manager), runtime)
        
    return None, create_gather_lookup_date_node(get_context_snapshot(flow_manager), runtime)

provide_lookup_phone_func = FlowsFunctionSchema(
    name="provide_lookup_phone",
    handler=handle_provide_lookup_phone,
    description="User confirmed or provided the phone number used for the appointment.",
    properties={"phone": {"type": "string", "description": "The 10-digit phone number"}},
    required=["phone"]
)

def create_gather_lookup_date_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    import datetime
    from zoneinfo import ZoneInfo
    now_ist = datetime.datetime.now(ZoneInfo("Asia/Kolkata"))
    calendar_ref = f"Today: {now_ist.strftime('%A, %B %d, %Y')}\nTomorrow: {(now_ist + datetime.timedelta(days=1)).strftime('%A, %B %d, %Y')}"
    
    lookup_error = (runtime_state or {}).get("lookup_date_error")
    
    if lookup_error:
        prompt = f"The system checked the database and found NO appointments on {lookup_error}. Apologize to the user and ask if they are sure about the date, or ask them to provide another date. DO NOT call provide_lookup_date when asking them."
    else:
        prompt = "Ask exactly ONE short question: 'May I ask what date is your appointment for?' DO NOT call provide_lookup_date when asking this."
        
    return NodeConfig(
        name="gather_lookup_date",
        task_messages=[
            {
                "role": "system",
                "content": f"{prompt}\n\nCALENDAR REFERENCE:\n{calendar_ref}\n\nIMPORTANT (CRITICAL): DO NOT call provide_lookup_date yet. You must first ask the question and wait for the user to explicitly speak a date. ONLY call provide_lookup_date AFTER the user says a date."
            }
        ],
        functions=[provide_lookup_date_func, start_appointment_lookup_func, start_booking_func, urgent_case_func, doctor_info_func, end_call_func]
    )

async def handle_provide_lookup_date(args, flow_manager):
    date = args.get("date")
    runtime = get_runtime(flow_manager)
    appointments = runtime.get("existing_appointments", [])
    
    # Filter appointments for the provided date
    filtered_appointments = [a for a in appointments if a.get("date") == date]
    runtime["filtered_appointments"] = filtered_appointments
    runtime["lookup_date"] = date
    
    if not filtered_appointments:
        runtime["lookup_date_error"] = date
        return None, create_gather_lookup_date_node(get_context_snapshot(flow_manager), runtime)
        
    runtime.pop("lookup_date_error", None)
    return None, create_manage_appointment_node(get_context_snapshot(flow_manager), runtime)

provide_lookup_date_func = FlowsFunctionSchema(
    name="provide_lookup_date",
    handler=handle_provide_lookup_date,
    description="Call this ONLY after the user has explicitly stated/spoken the date of their appointment. DO NOT call this to guess or when asking the user for the date.",
    properties={"date": {"type": "string", "description": "YYYY-MM-DD"}},
    required=["date"]
)

def create_manage_appointment_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    # Use filtered appointments
    appointments = (runtime_state or {}).get("filtered_appointments", [])
    
    # Format all metadata cleanly so the LLM can answer specific detail questions
    appointments_list = []
    for a in appointments:
        details = (
            f"- ID {a['id']}: Dr. {a.get('doctor', {}).get('name', 'Unknown')} (Specialization: {a.get('doctor', {}).get('specialization', 'General')}) "
            f"on {a['date']} at {normalize_time_for_tts(a['time'])}. "
            f"Patient Name: {a.get('patient_name', 'Unknown')}. "
            f"Phone: {a.get('patient_phone', 'Unknown')}. "
            f"Duration: {a.get('duration_minutes', 30)} minutes. "
            f"Status: {a.get('status', 'booked')}. "
            f"Notes: {a.get('notes') or 'None'}."
        )
        appointments_list.append(details)
    appointments_text = "\n".join(appointments_list)
    
    msg = "Tell the user their appointments for the requested date. DO NOT read the 'ID' or any metadata (like notes, duration, patient name) out loud unless they explicitly ask for it. If there is only one appointment, confirm if this is the one they want to manage. If there are multiple, read the list naturally (e.g. 'Dr. Davis at 10:30') and ask which one they are calling about.\n\nIf they ask for specific details of the appointment (e.g., 'What is the patient name?', 'What are the notes?', 'How long is it?'), answer them accurately using the metadata provided below.\n\nOnce they specify what they want to do:\n- If they want to cancel: call cancel_appointment.\n- If they want to reschedule: call start_reschedule.\n- If they just want to check details: simply state the details to the user and ask if they need anything else (DO NOT call any function for checking details)."
    
    return NodeConfig(
        name="manage_appointment",
        task_messages=[
            {
                "role": "system",
                "content": f"{msg}\n\nAppointments found:\n{appointments_text}\n\nIf they want to cancel, call cancel_appointment.\nIf they want to reschedule, call start_reschedule.\nIf they just wanted to check details, give them the details and ask if they need anything else (if no, call end_call)."
            }
        ],
        functions=[cancel_appointment_func, start_reschedule_func, start_appointment_lookup_func, start_booking_func, urgent_case_func, doctor_info_func, end_call_func]
    )

async def handle_cancel_appointment(args, flow_manager):
    appointment_id = int(args.get("appointment_id"))
    runtime = get_runtime(flow_manager)
    runtime["cancel_id"] = appointment_id
    return None, create_confirm_cancel_node(get_context_snapshot(flow_manager), runtime)

cancel_appointment_func = FlowsFunctionSchema(
    name="cancel_appointment",
    handler=handle_cancel_appointment,
    description="Cancel the user's appointment.",
    properties={"appointment_id": {"type": "string", "description": "The appointment ID as a string or integer"}},
    required=["appointment_id"]
)

def create_confirm_cancel_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    cancel_id = (runtime_state or {}).get("cancel_id")
    appointments = (runtime_state or {}).get("existing_appointments", [])
    
    appt_text = "your appointment"
    for appt in appointments:
        if str(appt.get("id")) == str(cancel_id):
            doc_name = appt.get("doctor", {}).get("name", "Unknown")
            appt_text = f"your appointment with Dr. {doc_name} at {normalize_time_for_tts(appt.get('time'))}"
            break
            
    return NodeConfig(
        name="confirm_cancel",
        task_messages=[
            {
                "role": "system",
                "content": f"The user requested to cancel their appointment. Ask the user: 'Are you sure you want to cancel {appt_text}?'\n\nIMPORTANT (CRITICAL): DO NOT call confirm_cancel yet. You must first ask the question and wait for the user to explicitly speak and confirm with YES. ONLY call confirm_cancel AFTER the user explicitly says YES/confirm to the question. If they say no, call start_appointment_lookup to return to the lookup menu."
            }
        ],
        functions=[confirm_cancel_func, start_appointment_lookup_func, start_booking_func, urgent_case_func, doctor_info_func, end_call_func]
    )

async def handle_confirm_cancel(args, flow_manager):
    runtime = get_runtime(flow_manager)
    appointment_id = runtime.get("cancel_id")
    from tools import cancel_appointment
    await cancel_appointment(appointment_id)
    runtime["just_cancelled"] = True
    return None, create_initial_node(get_context_snapshot(flow_manager), runtime)

confirm_cancel_func = FlowsFunctionSchema(
    name="confirm_cancel",
    handler=handle_confirm_cancel,
    description="Call this ONLY after the user has explicitly confirmed/said YES to cancelling the appointment. DO NOT call this preemptively or when asking the user for confirmation.",
    properties={},
    required=[]
)

async def handle_start_reschedule(args, flow_manager):
    appointment_id = int(args.get("appointment_id"))
    runtime = get_runtime(flow_manager)
    runtime["reschedule_id"] = appointment_id
    runtime["intent"] = "reschedule"
    
    # Pre-fill with the original appointment's date
    appointments = runtime.get("existing_appointments", [])
    original_date = ""
    for appt in appointments:
        if str(appt.get("id")) == str(appointment_id):
            original_date = appt.get("date", "")
            break
            
    runtime["booking_data"] = {"date": original_date}
    return None, create_gather_reschedule_details_node(get_context_snapshot(flow_manager), runtime)

start_reschedule_func = FlowsFunctionSchema(
    name="start_reschedule",
    handler=handle_start_reschedule,
    description="User wants to reschedule an appointment.",
    properties={"appointment_id": {"type": "string", "description": "The appointment ID as a string or integer"}},
    required=["appointment_id"]
)

# ==================== END EXISTING APPOINTMENT CHECK FLOW ====================

# ==================== RESCHEDULE FLOW ====================

def create_gather_reschedule_details_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    import datetime
    from zoneinfo import ZoneInfo
    now_ist = datetime.datetime.now(ZoneInfo("Asia/Kolkata"))
    calendar_ref = f"Today: {now_ist.strftime('%A, %B %d, %Y')}\nTomorrow: {(now_ist + datetime.timedelta(days=1)).strftime('%A, %B %d, %Y')}"
    
    return NodeConfig(
        name="gather_reschedule_details",
        task_messages=[
            {
                "role": "system",
                "content": f"You are rescheduling an appointment. Ask the user what new date and time they would like to reschedule to, OR if they just want to change the time on the same date.\n{calendar_ref}\n\nIf they only provide a new time, call provide_reschedule_time. If they only provide a new date, call provide_reschedule_date."
            }
        ],
        functions=[provide_reschedule_date_func, provide_reschedule_time_func, start_appointment_lookup_func, start_booking_func, urgent_case_func, doctor_info_func, end_call_func]
    )

async def handle_provide_reschedule_date(args, flow_manager):
    date = args.get("date")
    runtime = get_runtime(flow_manager)
    runtime["booking_data"]["date"] = date
    # Let's get the available slots for the original doctor on this new date
    # For now, we will just proceed to time gathering, and validation happens at confirmation or by the LLM
    return None, create_gather_reschedule_details_node(get_context_snapshot(flow_manager), runtime)

provide_reschedule_date_func = FlowsFunctionSchema(
    name="provide_reschedule_date",
    handler=handle_provide_reschedule_date,
    description="User provided the new date for rescheduling. Use this if they want to change the DATE.",
    properties={"date": {"type": "string", "description": "YYYY-MM-DD"}},
    required=["date"]
)

async def handle_provide_reschedule_time(args, flow_manager):
    time = args.get("time")
    runtime = get_runtime(flow_manager)
    runtime["booking_data"]["time"] = time
    date = runtime["booking_data"]["date"]
    
    # Get doctor ID of the existing appointment
    appointment_id = runtime.get("reschedule_id")
    appointments = runtime.get("existing_appointments", [])
    doctor_id = None
    for appt in appointments:
        if str(appt.get("id")) == str(appointment_id):
            doctor_id = appt.get("doctor_id")
            break
            
    await flow_manager.worker.queue_frames([TTSSpeakFrame(f"Let me check if {time} on {date} is available...")])
    
    if doctor_id:
        from tools import _CLIENT
        slots_data = await _CLIENT.get_available_slots(doctor_id, date)
        available_slots = slots_data.get("available_slots", [])
        
        # Simple string match (in real world, requires normalisation)
        if time not in available_slots and f"{time}:00" not in available_slots:
            # Slot not found
            await flow_manager.worker.queue_frames([TTSSpeakFrame(f"I'm sorry, {time} is not available on that date.")])
            return None, create_reschedule_time_node(get_context_snapshot(flow_manager), runtime)
            
    return None, create_confirm_reschedule_node(get_context_snapshot(flow_manager), runtime)

provide_reschedule_time_func = FlowsFunctionSchema(
    name="provide_reschedule_time",
    handler=handle_provide_reschedule_time,
    description="User provided the new time.",
    properties={"time": {"type": "string", "description": "HH:MM"}},
    required=["time"]
)

def create_confirm_reschedule_node(context_snapshot: dict | None = None, runtime_state: dict | None = None) -> NodeConfig:
    date = (runtime_state or {}).get("booking_data", {}).get("date", "unknown")
    time = (runtime_state or {}).get("booking_data", {}).get("time", "unknown")
    
    return NodeConfig(
        name="confirm_reschedule",
        task_messages=[
            {
                "role": "system",
                "content": f"The requested new slot is available. Ask the user to confirm: 'Are you sure you want to update your appointment to {date} at {time}?'\nIf they say yes, call confirm_reschedule.\nIf they say no, call start_reschedule again to pick a different time."
            }
        ],
        functions=[confirm_reschedule_func, start_reschedule_func, end_call_func, doctor_info_func, urgent_case_func]
    )

async def handle_confirm_reschedule(args, flow_manager):
    runtime = get_runtime(flow_manager)
    appointment_id = runtime.get("reschedule_id")
    date = runtime.get("booking_data", {}).get("date")
    time = runtime.get("booking_data", {}).get("time")
    
    from tools import reschedule_appointment
    await reschedule_appointment(appointment_id, date, time)
    
    await flow_manager.worker.queue_frames([TTSSpeakFrame("Your appointment has been successfully rescheduled. Is there anything else I can help you with today?")])
    return None, create_initial_node(get_context_snapshot(flow_manager), runtime)

confirm_reschedule_func = FlowsFunctionSchema(
    name="confirm_reschedule",
    handler=handle_confirm_reschedule,
    description="User confirmed the reschedule.",
    properties={},
    required=[]
)

# ==================== END RESCHEDULE FLOW ====================

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
            vad_analyzer=global_vad_analyzer,
            serializer=serializer,
        ),
    )

    stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        settings=CartesiaTTSService.Settings(voice="79a125e8-cd45-4c13-8a67-188112f4dd22")
    )
    llm = global_llm

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

        greeting = f"Good {time_of_day}, this is {CLINIC_NAME}. I'm Emily. How can I help you today?"
        runtime_state["last_bot_text"] = greeting
        
        pcm_bytes = PRE_RENDERED_GREETINGS.get(time_of_day)
        if pcm_bytes:
            logger.info(f"Streaming pre-rendered greeting for {time_of_day} ({len(pcm_bytes)} bytes)")
            
            # Send audio in a background task so it doesn't block the connection handler
            async def stream_audio():
                chunk_size = 640  # 20ms of 16kHz mono 16-bit PCM
                for i in range(0, len(pcm_bytes), chunk_size):
                    chunk = pcm_bytes[i:i+chunk_size]
                    await task.queue_frames([OutputAudioRawFrame(audio=chunk, sample_rate=16000, num_channels=1)])
                    # Sleep slightly less than 20ms to prevent gaps and keep the buffer warm
                    await asyncio.sleep(0.019)
            
            asyncio.create_task(stream_audio())
        else:
            logger.warning(f"No pre-rendered greeting found for {time_of_day}. Falling back to TTS.")
            await task.queue_frames([TTSSpeakFrame(greeting)])
            
        await task.queue_frames([LLMMessagesAppendFrame(messages=[{"role": "assistant", "content": greeting}])])

    ingested = False

    async def perform_ingestion():
        nonlocal ingested
        if ingested:
            return
        ingested = True
        
        transcript_processor.stop_monitoring()
        call_info["end_time"] = dt.utcnow().isoformat() + "Z"
        update_stage(runtime_state, "ended")
        logger.info("Sending transcript to backend...")

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
        try:
            await task.cancel()
        except Exception:
            pass

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Twilio client disconnected event received.")
        await perform_ingestion()

    runner = PipelineRunner(handle_sigint=False, force_gc=True)
    try:
        await runner.run(task)
    finally:
        await perform_ingestion()
