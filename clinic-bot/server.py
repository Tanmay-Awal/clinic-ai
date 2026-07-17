#
# Copyright (c) 2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

from dotenv import load_dotenv
load_dotenv(override=True)

import argparse
import json

import uvicorn
from bot import run_bot
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import HTMLResponse

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Pre-warming clinic context cache...")
    try:
        from tools import get_clinic_context
        await get_clinic_context(refresh=True)
        print("Clinic context cache pre-warmed successfully!")
    except Exception as e:
        print(f"Failed to pre-warm clinic context cache: {e}")

    print("Pre-rendering greetings...")
    try:
        from bot import pre_render_all_greetings
        await pre_render_all_greetings()
        print("Greetings pre-rendered successfully!")
    except Exception as e:
        print(f"Failed to pre-render greetings: {e}")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/")
async def start_call(request: Request):
    print("POST TwiML")
    form_data = await request.form()
    from_number = form_data.get("From", "Unknown")
    to_number = form_data.get("To", "Unknown")
    
    # If the From number is the bot's (+1 number), use the To number as the caller.
    # Vice versa for inbound vs outbound calls.
    if from_number.startswith("+1"):
        caller_phone = to_number
    else:
        caller_phone = from_number
    
    # Generate dynamic WebSocket URL based on request host
    host = request.headers.get("host", "localhost:8765")
    # Determine wss vs ws based on forwarded proto or secure header
    scheme = request.headers.get("x-forwarded-proto", "https").replace("http", "ws")
    if "localhost" in host:
        scheme = "ws"
        
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="{scheme}://{host}/ws">
      <Parameter name="caller_phone" value="{caller_phone}" />
    </Stream>
  </Connect>
  <Pause length="40"/>
</Response>"""
            
    return HTMLResponse(content=xml_content, media_type="application/xml")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print("New WebSocket connection request...")
    await websocket.accept()
    start_data = websocket.iter_text()
    connected_msg = await start_data.__anext__()
    start_msg = await start_data.__anext__()
    call_data = json.loads(start_msg)
    print(call_data, flush=True)
    stream_sid = call_data["start"]["streamSid"]
    call_sid = call_data["start"]["callSid"]
    custom_params = call_data["start"].get("customParameters", {})
    caller_phone = custom_params.get("caller_phone", "Unknown")
    print("WebSocket connection accepted. Caller Phone:", caller_phone)

    # Replay the consumed messages so Pipecat's transport receives them
    original_receive = websocket.receive_text
    async def replayed_receive():
        if replayed_receive.queue:
            return replayed_receive.queue.pop(0)
        return await original_receive()
    replayed_receive.queue = [connected_msg, start_msg]
    websocket.receive_text = replayed_receive

    await run_bot(websocket, stream_sid, call_sid, caller_phone, app.state.testing)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipecat Twilio Chatbot Server")
    parser.add_argument(
        "-t", "--test", action="store_true", default=False, help="set the server in testing mode"
    )
    args, _ = parser.parse_known_args()

    app.state.testing = args.test

    uvicorn.run(app, host="0.0.0.0", port=8765)
