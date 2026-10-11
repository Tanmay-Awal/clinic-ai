#
# Copyright (c) 2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

import argparse
import json
import logging
import sys
import traceback
from datetime import datetime

from dotenv import load_dotenv
load_dotenv(override=True)

import uvicorn
from bot import run_bot
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("TwilioServer")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/")
async def start_call(request: Request):
    """Webhook endpoint called by Twilio when an inbound/outbound call connects."""
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "Unknown")
    from_number = form_data.get("From", "Unknown")
    to_number = form_data.get("To", "Unknown")
    direction = form_data.get("Direction", "unknown")

    logger.info(f"[CALL-INIT] CallSid={call_sid} | Direction={direction} | From={from_number} | To={to_number}")

    # Determine caller's phone number
    if from_number.startswith("+1"):
        caller_phone = to_number
    else:
        caller_phone = from_number

    # Generate dynamic WebSocket and Status URLs based on request Host
    host = request.headers.get("host", "localhost:8765")
    is_local = "localhost" in host or "127.0.0.1" in host
    ws_scheme = "ws" if is_local else "wss"
    http_scheme = "http" if is_local else "https"

    stream_url = f"{ws_scheme}://{host}/ws"
    status_url = f"{http_scheme}://{host}/stream-status"

    logger.info(f"[CALL-INIT] CallSid={call_sid} | StreamURL={stream_url} | StatusCallback={status_url}")

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting to clinic bot.</Say>
  <Connect>
    <Stream url="{stream_url}" />
  </Connect>
  <Pause length="30" />
</Response>"""

    return Response(content=xml_content, media_type="application/xml")


@app.post("/stream-status")
async def stream_status(request: Request):
    """Twilio Media Stream lifecycle status callback endpoint."""
    form_data = await request.form()
    event_data = dict(form_data)
    stream_sid = event_data.get("StreamSid", "Unknown")
    call_sid = event_data.get("CallSid", "Unknown")
    status_callback_event = event_data.get("StatusCallbackEvent", event_data.get("event", "Unknown"))
    error_code = event_data.get("ErrorCode")
    error_message = event_data.get("ErrorMessage")

    if error_code or error_message:
        logger.error(
            f"[STREAM-ERROR] StreamSid={stream_sid} CallSid={call_sid} | "
            f"Code={error_code} | Msg={error_message} | Details={event_data}"
        )
    else:
        logger.info(
            f"[STREAM-STATUS] StreamSid={stream_sid} CallSid={call_sid} | "
            f"Event={status_callback_event} | Track={event_data.get('Track', '')}"
        )

    return Response(content="<Response/>", media_type="application/xml")


@app.post("/call-status")
async def call_status(request: Request):
    """Twilio Call resource status callback endpoint."""
    form_data = await request.form()
    event_data = dict(form_data)
    call_sid = event_data.get("CallSid", "Unknown")
    call_status_val = event_data.get("CallStatus", "Unknown")
    duration = event_data.get("CallDuration", "")

    logger.info(
        f"[CALL-STATUS] CallSid={call_sid} | Status={call_status_val} | "
        f"Duration={duration}s"
    )
    return Response(content="<Response/>", media_type="application/xml")


@app.api_route("/exotel", methods=["GET", "POST"])
async def exotel_webhook(request: Request):
    """Webhook endpoint for Exotel Voicebot Applet when configured with dynamic HTTP URL."""
    host = request.headers.get("host", "proaudience-kenisha-firstly.ngrok-free.dev")
    is_local = "localhost" in host or "127.0.0.1" in host
    ws_scheme = "ws" if is_local else "wss"
    ws_url = f"{ws_scheme}://{host}/ws"
    logger.info(f"[EXOTEL-WEBHOOK] Returning stream URL: {ws_url}")
    return {"url": ws_url}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Bidirectional Media Stream WebSocket endpoint for Pipecat Voice Bot (Exotel)."""
    logger.info("[WS-CONNECT] Incoming WebSocket connection request received.")
    await websocket.accept()
    logger.info("[WS-ACCEPTED] WebSocket connection accepted. Reading initial handshake frames...")

    try:
        first_msg = await websocket.receive_text()
        first_data = json.loads(first_msg)
        logger.info(f"[WS-EVENT] Handshake event 1: {first_data.get('event')}")

        if first_data.get("event") == "start":
            call_data = first_data
        else:
            # Usually 'connected', next is 'start'
            start_msg = await websocket.receive_text()
            call_data = json.loads(start_msg)
            logger.info(f"[WS-EVENT] Handshake event 2: {call_data.get('event')}")

        start_payload = call_data.get("start", {})
        stream_sid = (
            start_payload.get("stream_sid")
            or start_payload.get("streamSid")
            or call_data.get("stream_sid")
            or call_data.get("streamSid")
            or "stream_exotel"
        )
        call_sid = (
            start_payload.get("call_sid")
            or start_payload.get("callSid")
            or call_data.get("call_sid")
            or "call_exotel"
        )
        custom_params = start_payload.get("custom_parameters") or start_payload.get("customParameters") or {}
        caller_phone = (
            start_payload.get("from")
            or custom_params.get("caller_phone")
            or custom_params.get("From")
            or "08279450204"
        )

        logger.info(
            f"[WS-HANDSHAKE-OK] StreamSid={stream_sid} | CallSid={call_sid} | CallerPhone={caller_phone}"
        )

        logger.info(f"[PIPELINE-START] Launching Pipecat voice pipeline for CallSid={call_sid}...")
        testing_mode = getattr(app.state, "testing", False)
        await run_bot(websocket, stream_sid, call_sid, caller_phone, testing_mode)
        logger.info(f"[PIPELINE-COMPLETE] Voice pipeline finished cleanly for CallSid={call_sid}.")

    except WebSocketDisconnect as disc:
        logger.info(f"[WS-DISCONNECT] WebSocket disconnected (code={disc.code}, reason={disc.reason}).")
    except Exception as exc:
        logger.error(f"[WS-FATAL] Unhandled exception in WebSocket handler: {exc}\n{traceback.format_exc()}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipecat Twilio Chatbot Server")
    parser.add_argument(
        "-t", "--test", action="store_true", default=False, help="set the server in testing mode"
    )
    args, _ = parser.parse_known_args()

    app.state.testing = args.test

    logger.info("Starting Pipecat Twilio Server on http://0.0.0.0:8765 ...")
    uvicorn.run(app, host="0.0.0.0", port=8765)
