import os
import sys
import time
import asyncio
import requests
from datetime import datetime as dt, timezone, timedelta
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv(override=True)
sys.stdout.reconfigure(encoding='utf-8')

from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.transports.daily.transport import DailyTransport, DailyParams
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.flows import FlowManager

from bot import (
    RotatedGroqLLMService,
    LocalAudioRecorder,
    TranscriptProcessor,
    AssistantSpeechMonitor,
    create_initial_node,
    ensure_runtime_state,
    update_stage,
    CLINIC_NAME,
    build_summary_payload,
)
from tools import get_clinic_context


def create_daily_room(api_key: str):
    """Creates a temporary Daily room with 2-hour expiry."""
    res = requests.post(
        "https://api.daily.co/v1/rooms",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "properties": {
                "exp": int(time.time()) + 7200,
                "enable_chat": True,
                "enable_screenshare": False,
            }
        },
        timeout=10,
    )
    if not res.ok:
        raise RuntimeError(f"Failed to create Daily room: {res.status_code} - {res.text}")
    return res.json()["url"]


async def main():
    daily_key = os.getenv("DAILY_API_KEY")
    if not daily_key:
        print("ERROR: DAILY_API_KEY is not set in .env")
        return

    print("\n" + "=" * 70)
    print("             CREATING YOUR DAILY VOICE ROOM...")
    print("=" * 70)

    try:
        room_url = create_daily_room(daily_key)
    except Exception as e:
        print(f"Failed to create Daily room: {e}")
        return

    print(f"\n[READY] YOUR BOT ROOM IS LIVE!")
    print(f"\n>>> CLICK THIS LINK ON YOUR PHONE OR LAPTOP TO TALK TO SALONI: <<<\n")
    print(f"    {room_url}\n")
    print("=" * 70)
    print("Instructions: Open the link above, allow microphone, and Saloni")
    print("will immediately greet you and handle clinic appointment bookings!")
    print("=" * 70 + "\n")

    # Set up Daily Transport
    vad = SileroVADAnalyzer(params=VADParams(start_secs=0.08, stop_secs=0.18, confidence=0.5))
    transport_params = DailyParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        vad_analyzer=vad,
    )
    transport = DailyTransport(
        room_url=room_url,
        token=None,
        bot_name="Saloni (City Health Clinic)",
        params=transport_params,
    )

    # Initialize Services
    stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))
    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22",
    )

    # Groq Model
    groq_keys = [os.getenv("GROQ_API_KEY")]
    for i in range(2, 10):
        k = os.getenv(f"GROQ_API_KEY_{i}")
        if k:
            groq_keys.append(k)
    groq_keys = [k for k in groq_keys if k]
    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    llm = RotatedGroqLLMService(api_keys=groq_keys, base_url="https://api.groq.com/openai/v1", model=groq_model)

    context = LLMContext(messages=[])
    context_aggregator = LLMContextAggregatorPair(context)

    caller_phone = os.getenv("TARGET_PHONE_NUMBER", "+918279450204")
    runtime_state = ensure_runtime_state({"caller_phone": caller_phone, "booking_data": {}}, caller_phone)

    task = None
    def task_getter():
        return task

    transcript_processor = TranscriptProcessor(context, runtime_state, task_getter)
    assistant_monitor = AssistantSpeechMonitor(transcript_processor)
    recorder = LocalAudioRecorder(call_id=f"daily_{int(time.time())}")

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

    try:
        runtime_state["context_snapshot"] = await get_clinic_context(refresh=False)
    except Exception as exc:
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

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        logger.info(f"User joined the call! Participant ID: {participant.get('id')}")
        transcript_processor.start_timeout_monitoring()
        update_stage(runtime_state, "greeting")

        try:
            ist_time = dt.now(ZoneInfo("Asia/Kolkata"))
        except Exception:
            ist_time = dt.now(timezone(timedelta(hours=5, minutes=30)))
        hour = ist_time.hour
        if hour < 12:
            time_of_day = "Morning"
        elif hour < 17:
            time_of_day = "Afternoon"
        else:
            time_of_day = "Evening"

        greeting = f"Good {time_of_day}, this is {CLINIC_NAME}. I'm Saloni. How can I help you today?"
        runtime_state["last_bot_text"] = greeting
        await task.queue_frames([TTSSpeakFrame(greeting)])
        context.add_message({"role": "assistant", "content": greeting})

    @transport.event_handler("on_participant_left")
    async def on_participant_left(transport, participant, reason):
        logger.info("User left the call.")
        await task.cancel()

    runner = PipelineRunner()
    await runner.run(task)


if __name__ == "__main__":
    asyncio.run(main())
