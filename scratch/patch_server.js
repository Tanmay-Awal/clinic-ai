import fs from 'fs';
import path from 'path';

const targetFile = path.join('d:', 'Clinic Development Sales', 'clinic-bot', 'server.py');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace the start_call function to dynamically use the request host
const newStartCall = `@app.post("/")
async def start_call(request: Request):
    print("POST TwiML")
    host = request.headers.get("host")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://{host}/ws"></Stream>
  </Connect>
  <Pause length="40"/>
</Response>"""
    return HTMLResponse(content=xml, media_type="application/xml")`;

// Also need to import Request from fastapi
if (!content.includes('from fastapi import FastAPI, WebSocket, Request')) {
    content = content.replace('from fastapi import FastAPI, WebSocket', 'from fastapi import FastAPI, WebSocket, Request');
}

// Replace the old start_call
content = content.replace(/@app\.post\("\/"\)\nasync def start_call\(\):\n\s*print\("POST TwiML"\)\n\s*return HTMLResponse\(content=open\("templates\/streams\.xml"\)\.read\(\), media_type="application\/xml"\)/g, newStartCall);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated server.py to use dynamic host.');
