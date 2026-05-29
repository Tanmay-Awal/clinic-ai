import os
from fastapi import FastAPI, Request, HTTPException
import uvicorn
from loguru import logger
import subprocess
import asyncio

app = FastAPI()

@app.post("/webhook/call")
async def handle_call(request: Request):
    """
    Webhook endpoint to trigger a bot instance.
    For local testing, you can hit this endpoint to launch bot.py in a subprocess.
    """
    data = await request.json()
    logger.info(f"Received call webhook: {data}")
    
    # In a real production setup, you would create a Daily room via API and pass the URL
    # For now, we assume a static room URL is set in .env
    
    # Launch bot in a background process
    # Note: For production Pipecat apps, running bots in subprocesses or using a worker pool is recommended
    subprocess.Popen(["python", "bot.py"])
    
    return {"status": "bot_launched"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting Bot Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
