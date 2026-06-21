import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

# Configuration
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
# REPLACE THIS WITH YOUR RUNNING NGROK URL (e.g., https://abc.ngrok-free.app)
NGROK_URL = "https://ba56-171-61-19-78.ngrok-free.app" 

if not account_sid or not auth_token:
    print("Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env")
    exit(1)

client = Client(account_sid, auth_token)

# The URL that Twilio will fetch when the call is answered.
# This should point to your local server (proxied via ngrok).
server_url = f"{NGROK_URL}/"

print(f"Initiating call to your phone...")
print(f"Server URL: {server_url}")

call = client.calls.create(
    to="+918279450204",        # your phone
    from_="+19086571711",      # your Twilio number
    url=server_url
)

print(f"Call initiated. SID: {call.sid}")
