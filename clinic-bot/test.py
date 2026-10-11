import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv(override=True)
sys.stdout.reconfigure(encoding='utf-8')

# Exotel Credentials
api_key = os.getenv("EXOTEL_API_KEY")
api_token = os.getenv("EXOTEL_API_TOKEN")
acct_sid = os.getenv("EXOTEL_ACCOUNT_SID", "awaltraders1")
exophone = os.getenv("EXOTEL_PHONE_NUMBER", "09513886363")
flow_id = os.getenv("EXOTEL_FLOW_ID", "1358492")

# Optional phone number passed via command line: python test.py <phone_number>
if len(sys.argv) > 1:
    raw_phone = sys.argv[1].strip().replace("+91", "").replace("-", "").replace(" ", "")
    target_phone = f"0{raw_phone}" if not raw_phone.startswith("0") else raw_phone
else:
    target_phone = os.getenv("TARGET_PHONE_NUMBER", "08279450204")

print("=" * 65)
print("             EXOTEL OUTBOUND VOICE CALL TRIGGER")
print("=" * 65)
print(f"Account SID:    {acct_sid}")
print(f"ExoPhone:       {exophone}")
print(f"To Number:      {target_phone}")
print(f"Flow ID:        {flow_id or 'Not specified (pass as argument)'}")
print("=" * 65)

if not api_key or not api_token or not acct_sid:
    print("Error: EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_ACCOUNT_SID must be set in .env")
    exit(1)

if not flow_id:
    print("\n[NOTE] To place an outbound call, we need your Exotel Flow ID.")
    print("Run: python test.py <flow_id>")
    print("\nOR: You can test INBOUND immediately by dialing your ExoPhone:")
    print(f"    --> Call {exophone} from your phone {target_phone} <--\n")
    exit(0)

# Exotel Outbound Connect Endpoint
endpoint = f"https://api.exotel.com/v1/Accounts/{acct_sid}/Calls/connect.json"
flow_url = f"http://my.exotel.com/{acct_sid}/exoml/start_voice/{flow_id}"

payload = {
    "From": target_phone,
    "CallerId": exophone,
    "Url": flow_url,
    "CallType": "trans",
}

print(f"\nInitiating outbound call to {target_phone} via Exotel Flow {flow_id}...")

try:
    resp = requests.post(endpoint, auth=(api_key, api_token), data=payload)
    print(f"HTTP Response Code: {resp.status_code}")
    
    if resp.ok:
        data = resp.json()
        call_sid = data.get("Call", {}).get("Sid", "Initiated")
        print(f"\n[SUCCESS] Outbound Call placed via Exotel!")
        print(f"Call SID: {call_sid}")
        print("=" * 65)
        print("Your phone will ring shortly. Answer it to speak with Saloni!")
        print("=" * 65 + "\n")
    else:
        print(f"\n[ERROR] Exotel returned error: {resp.status_code}")
        print(f"Details: {resp.text}\n")
except Exception as e:
    print(f"\n[FATAL] Failed to send request to Exotel: {e}\n")
