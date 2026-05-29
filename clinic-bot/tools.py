import os
import aiohttp
from loguru import logger

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001/api")

async def get_doctors():
    """Fetch the list of available doctors in the clinic."""
    logger.info("Tool called: get_doctors")
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BACKEND_URL}/appointments/doctors") as response:
            if response.status == 200:
                doctors = await response.json()
                return {"doctors": [{"id": d["id"], "name": d["name"], "specialization": d["specialization"]} for d in doctors]}
            return {"error": "Failed to fetch doctors"}

async def get_available_slots(doctor_id: int, date: str):
    """Get available time slots for a specific doctor on a specific date (YYYY-MM-DD)."""
    logger.info(f"Tool called: get_available_slots (doctor_id={doctor_id}, date={date})")
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BACKEND_URL}/appointments/slots?doctorId={doctor_id}&date={date}") as response:
            if response.status == 200:
                slots = await response.json()
                return {"date": date, "available_slots": slots}
            return {"error": "Failed to fetch slots"}

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
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BACKEND_URL}/appointments", json=payload) as response:
            if response.status in [200, 201]:
                data = await response.json()
                return {"success": True, "appointment_id": data.get("id")}
            return {"error": "Failed to book appointment"}

def setup_tools(llm):
    llm.register_function("get_doctors", get_doctors)
    llm.register_function("get_available_slots", get_available_slots)
    llm.register_function("book_appointment", book_appointment)
