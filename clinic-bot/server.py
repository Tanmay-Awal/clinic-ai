#
# Copyright (c) 2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

import argparse
import json

import uvicorn
from bot import run_bot
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import HTMLResponse

load_dotenv()

app = FastAPI()

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
    caller_phone = form_data.get("From", "Unknown")
    
    # Read the XML and inject the parameter
    xml_content = open("templates/streams.xml").read()
    if "<Stream" in xml_content and "</Stream>" in xml_content:
        # Inject custom parameter inside Stream tag
        param_tag = f'\n      <Parameter name="caller_phone" value="{caller_phone}" />\n    '
        xml_content = xml_content.replace("></Stream>", f">{param_tag}</Stream>")
    elif "<Stream" in xml_content and "/>" in xml_content:
        # Self closing tag
        # Replace <Stream ... /> with <Stream ...><Parameter ... /></Stream>
        parts = xml_content.split("/>", 1)
        # Find the last <Stream
        stream_idx = parts[0].rfind("<Stream")
        if stream_idx != -1:
            param_tag = f'>\n      <Parameter name="caller_phone" value="{caller_phone}" />\n    </Stream>'
            xml_content = parts[0][:stream_idx] + parts[0][stream_idx:] + param_tag + parts[1]
            
    return HTMLResponse(content=xml_content, media_type="application/xml")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print("New WebSocket connection request...")
    await websocket.accept()
    start_data = websocket.iter_text()
    await start_data.__anext__()
    call_data = json.loads(await start_data.__anext__())
    print(call_data, flush=True)
    stream_sid = call_data["start"]["streamSid"]
    call_sid = call_data["start"]["callSid"]
    custom_params = call_data["start"].get("customParameters", {})
    caller_phone = custom_params.get("caller_phone", "Unknown")
    print("WebSocket connection accepted. Caller Phone:", caller_phone)
    await run_bot(websocket, stream_sid, call_sid, caller_phone, app.state.testing)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipecat Twilio Chatbot Server")
    parser.add_argument(
        "-t", "--test", action="store_true", default=False, help="set the server in testing mode"
    )
    args, _ = parser.parse_known_args()

    app.state.testing = args.test

    uvicorn.run(app, host="0.0.0.0", port=8765)
