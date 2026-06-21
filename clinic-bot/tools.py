import os
import aiohttp
from loguru import logger

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001/api")

async def get_doctors():
    """Fetch the list of available doctors in the clinic."""
    logger.info("Tool called: get_doctors")
    headers = {"x-bot-api-key": os.getenv("BOT_API_KEY")}
    timeout = aiohttp.ClientTimeout(total=5)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(f"{BACKEND_URL}/appointments/doctors", headers=headers) as response:
                if response.status == 200:
                    res = await response.json()
                    doctors = res.get("data") or []
                    return {"doctors": [{"id": int(d.get("id", 1)), "name": d.get("name", ""), "specialization": d.get("specialization") or ""} for d in doctors]}
                return {"error": "Failed to fetch doctors"}
    except Exception as e:
        logger.error(f"Error fetching doctors: {e}")
        return {"error": "Connection to the clinic system timed out. Please ask the patient to try again later."}

async def get_available_slots(doctor_id: int, date: str):
    """Get available time slots for a specific doctor on a specific date (YYYY-MM-DD)."""
    logger.info(f"Tool called: get_available_slots (doctor_id={doctor_id}, date={date})")
    headers = {"x-bot-api-key": os.getenv("BOT_API_KEY")}
    timeout = aiohttp.ClientTimeout(total=5)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(f"{BACKEND_URL}/appointments/slots?doctorId={doctor_id}&date={date}", headers=headers) as response:
                if response.status == 200:
                    res = await response.json()
                    slots = res.get("data") or []
                    return {"date": date, "available_slots": slots}
                return {"error": "Failed to fetch slots"}
    except Exception as e:
        logger.error(f"Error fetching slots: {e}")
        return {"error": "Connection to the clinic system timed out. Please ask the patient to try again later."}

async def book_appointment(doctor_id: int, date: str, time: str, patient_name: str, patient_phone: str):
    """Book an appointment."""
    logger.info(f"Tool called: book_appointment")
    payload = {
        "doctor_id": doctor_id,
        "date": date,
        "time": time,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "status": "booked"
    }
    headers = {"x-bot-api-key": os.getenv("BOT_API_KEY")}
    timeout = aiohttp.ClientTimeout(total=5)
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(f"{BACKEND_URL}/appointments", json=payload, headers=headers) as response:
                if response.status in [200, 201]:
                    res = await response.json()
                    data = res.get("data") or {}
                    return {"success": True, "appointment_id": data.get("id")}
                return {"error": "Failed to book appointment"}
    except Exception as e:
        logger.error(f"Error booking appointment: {e}")
        return {"error": "Connection to the clinic system timed out. Please ask the patient to try again later."}

def setup_tools(llm):
    llm.register_function("get_doctors", get_doctors)
    llm.register_function("get_available_slots", get_available_slots)
    llm.register_function("book_appointment", book_appointment)
