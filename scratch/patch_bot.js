import fs from 'fs';
import path from 'path';

const targetFile = path.join('d:', 'Clinic Development Sales', 'clinic-bot', 'bot.py');
let content = fs.readFileSync(targetFile, 'utf8');

const mainIndex = content.indexOf('# ==================== MAIN PIPELINE ====================');
if (mainIndex !== -1) {
    content = content.substring(0, mainIndex);
}

// Add necessary imports at the top if they are missing
if (!content.includes('from fastapi import WebSocket')) {
    content = content.replace('from dotenv import load_dotenv\n', 'from dotenv import load_dotenv\nfrom fastapi import WebSocket\n');
}
if (!content.includes('from pipecat.serializers.twilio import TwilioFrameSerializer')) {
    content = content.replace('from pipecat.services.cartesia import CartesiaTTSService\n', 'from pipecat.services.cartesia import CartesiaTTSService\nfrom pipecat.serializers.twilio import TwilioFrameSerializer\nfrom pipecat.transports.network.fastapi_websocket import FastAPIWebsocketParams, FastAPIWebsocketTransport\nfrom pipecat.audio.vad.vad_analyzer import VADParams\n');
}
// Remove Daily imports
content = content.replace('from pipecat.transports.services.daily import DailyParams, DailyTransport\n', '');

const newMainContent = `
# ==================== MAIN PIPELINE ====================

async def run_bot(websocket_client: WebSocket, stream_sid: str, call_sid: str, testing: bool = False):
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
                vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=0.5)),
                serializer=serializer,
            ),
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

        task = PipelineTask(pipeline, PipelineParams(
            audio_in_sample_rate=8000,
            allow_interruptions=True
        ))

        @transport.event_handler("on_client_connected")
        async def on_client_connected(transport, client):
            # Trigger the LLM to speak first.
            from pipecat.frames.frames import LLMMessagesAppendFrame
            greeting = f"Hello, thanks for calling {CLINIC_NAME}, I'm Aria. How can I help you today?"
            # Add greeting directly to context and TTS
            await task.queue_frames([tts.speak(greeting)])
            await task.queue_frames([context_aggregator.user().get_context_frame()])

        @transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport, client):
            logger.info("Twilio client disconnected. Sending transcript to backend...")
            transcript = transcript_processor.get_transcript()
            payload = {
                "call_id": call_sid, # use call_sid as ID since Daily participant ID is gone
                "caller_phone": "Unknown",
                "transcript": transcript,
            }
            try:
                async with session.post(f"{BACKEND_URL}/calls/ingest", json=payload) as resp:
                    logger.info(f"Backend ingest status: {resp.status}")
            except Exception as e:
                logger.error(f"Failed to ingest to backend: {e}")
            await task.cancel()

        runner = PipelineRunner(handle_sigint=False, force_gc=True)
        await runner.run(task)
`;

fs.writeFileSync(targetFile, content + newMainContent);
console.log('Successfully patched bot.py for Twilio.');
