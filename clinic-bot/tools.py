from typing import Any, Dict

from loguru import logger

from runtime import ClinicBackendClient

_CLIENT = ClinicBackendClient()


async def get_clinic_context(date: str | None = None, days_ahead: int = 3, refresh: bool = False) -> Dict[str, Any]:
    logger.info("Tool called: get_clinic_context")
    return await _CLIENT.get_clinic_context(date=date, days_ahead=days_ahead, refresh=refresh)


async def get_doctors(refresh: bool = False):
    """Fetch the list of available doctors in the clinic."""
    logger.info("Tool called: get_doctors")
    return await _CLIENT.get_doctors(refresh=refresh)


async def get_available_slots(doctor_id: int, date: str, refresh: bool = False):
    """Get available time slots for a specific doctor on a specific date (YYYY-MM-DD)."""
    logger.info(f"Tool called: get_available_slots (doctor_id={doctor_id}, date={date})")
    return await _CLIENT.get_available_slots(doctor_id, date, refresh=refresh)


async def book_appointment(
    doctor_id: int,
    date: str,
    time: str,
    patient_name: str,
    patient_phone: str,
    *,
    notes: str | None = None,
    conversation_state: Dict[str, Any] | None = None,
    telemetry: Dict[str, Any] | None = None,
    call_summary: str | None = None,
    intent: str | None = None,
    context_snapshot: Dict[str, Any] | None = None,
):
    """Book an appointment."""
    logger.info("Tool called: book_appointment")
    payload = {
        "doctor_id": doctor_id,
        "date": date,
        "time": time,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "notes": notes or "",
        "status": "booked",
        "source": "clinic-bot",
        "conversation_state": conversation_state or {},
        "telemetry": telemetry or {},
        "call_summary": call_summary or "",
        "intent": intent or "",
        "context_snapshot": context_snapshot or {},
    }
    return await _CLIENT.book_appointment(payload)


async def ingest_call(payload: Dict[str, Any]):
    """Ingest call metadata after call ends."""
    logger.info("Tool called: ingest_call")
    return await _CLIENT.ingest_call(payload)


async def lookup_appointments(phone: str):
    """Lookup existing appointments by phone number."""
    logger.info(f"Tool called: lookup_appointments for {phone}")
    return await _CLIENT.lookup_appointments(phone)


async def cancel_appointment(appointment_id: int):
    """Cancel an existing appointment."""
    logger.info(f"Tool called: cancel_appointment for id {appointment_id}")
    return await _CLIENT.update_appointment(appointment_id, {"status": "cancelled"})


async def reschedule_appointment(appointment_id: int, date: str, time: str):
    """Reschedule an existing appointment to a new date and time."""
    logger.info(f"Tool called: reschedule_appointment for id {appointment_id} to {date} {time}")
    return await _CLIENT.update_appointment(appointment_id, {"date": date, "time": time, "status": "rescheduled"})


def setup_tools(llm):
    llm.register_function("get_clinic_context", get_clinic_context)
    llm.register_function("get_doctors", get_doctors)
    llm.register_function("get_available_slots", get_available_slots)
    llm.register_function("book_appointment", book_appointment)
    llm.register_function("ingest_call", ingest_call)
    llm.register_function("lookup_appointments", lookup_appointments)
    llm.register_function("cancel_appointment", cancel_appointment)
    llm.register_function("reschedule_appointment", reschedule_appointment)

