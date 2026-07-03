import asyncio
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import aiohttp
from loguru import logger


DEFAULT_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001/api")
DEFAULT_CACHE_TTL_SECONDS = int(os.getenv("BOT_CONTEXT_CACHE_TTL", "45"))


@dataclass
class BackendCacheEntry:
    value: Dict[str, Any]
    expires_at: float


@dataclass
class IntentResult:
    intent: str
    confidence: float
    should_route: bool
    fallback_hint: str = ""


def ensure_runtime_state(state: Dict[str, Any], caller_phone: str) -> Dict[str, Any]:
    runtime = state.setdefault(
        "runtime",
        {
            "caller_phone": caller_phone,
            "current_stage": "initial",
            "intent": "unknown",
            "intent_confidence": 0.0,
            "fallback_count": 0,
            "interruption_count": 0,
            "silence_prompts": 0,
            "stage_started_at": {},
            "stage_durations_ms": {},
            "external_calls": [],
            "last_user_text": "",
            "last_bot_text": "",
            "summary_hints": [],
            "booking_result": {},
            "context_snapshot": {},
        },
    )
    runtime.setdefault("booking_data", state.setdefault("booking_data", {}))
    runtime["caller_phone"] = caller_phone or runtime.get("caller_phone", "Unknown")
    return runtime


def update_stage(runtime: Dict[str, Any], stage: str) -> None:
    now = asyncio.get_event_loop().time()
    previous = runtime.get("current_stage")
    started_at = runtime.setdefault("stage_started_at", {})
    durations = runtime.setdefault("stage_durations_ms", {})
    if previous and previous in started_at:
        durations[previous] = int((now - started_at[previous]) * 1000)
    runtime["current_stage"] = stage
    started_at[stage] = now


def record_external_call(runtime: Dict[str, Any], name: str, elapsed_ms: int, success: bool, detail: str = "") -> None:
    runtime.setdefault("external_calls", []).append(
        {
            "name": name,
            "elapsed_ms": elapsed_ms,
            "success": success,
            "detail": detail,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    )


def mark_fallback(runtime: Dict[str, Any], reason: str) -> None:
    runtime["fallback_count"] = int(runtime.get("fallback_count", 0)) + 1
    if reason:
        runtime.setdefault("summary_hints", []).append(reason)


def note_interruption(runtime: Dict[str, Any]) -> None:
    runtime["interruption_count"] = int(runtime.get("interruption_count", 0)) + 1


def note_silence_prompt(runtime: Dict[str, Any]) -> None:
    runtime["silence_prompts"] = int(runtime.get("silence_prompts", 0)) + 1


def classify_intent(text: str, context: Optional[Dict[str, Any]] = None) -> IntentResult:
    lowered = (text or "").lower().strip()
    context = context or {}

    rules = [
        ("urgent_case", 0.98, ["emergency", "urgent", "severe pain", "blood", "breathing", "medical advice", "live transfer", "ambulance"]),
        ("cancellation", 0.95, ["cancel", "cancellation", "can't make it", "cannot make it", "won't come", "not coming"]),
        ("reschedule", 0.93, ["reschedule", "change my appointment", "move my appointment", "different day", "different time"]),
        ("booking", 0.92, ["book", "appointment", "reserve", "availability", "slot", "available", "schedule", "see a doctor"]),
        ("doctor_info", 0.9, ["doctor", "specialist", "specialization", "physician", "consultant"]),
        ("faq", 0.82, ["hours", "open", "closing", "location", "park", "parking", "price", "cost", "fee"]),
    ]

    for intent, confidence, keywords in rules:
        if any(keyword in lowered for keyword in keywords):
            return IntentResult(intent=intent, confidence=confidence, should_route=True)

    if lowered in {"yes", "yeah", "yep", "sure", "okay"}:
        return IntentResult(intent=context.get("current_stage", "unknown"), confidence=0.55, should_route=False)

    return IntentResult(
        intent="clarify",
        confidence=0.35,
        should_route=False,
        fallback_hint="Ask one short clarification question.",
    )


def normalize_phone_for_tts(phone: str) -> str:
    digits = re.sub(r"\D+", "", phone or "")
    if not digits:
        return "the number you have on file"
    return " ".join(digits)


def normalize_time_for_tts(time_value: str) -> str:
    value = (time_value or "").strip()
    if not value:
        return value
    m = re.match(r"^(\d{2}):(\d{2})(?::(\d{2}))?$", value)
    if m:
        hour, minute = m.group(1), m.group(2)
        hour_int = int(hour)
        suffix = "a.m." if hour_int < 12 else "p.m."
        hour_12 = hour_int % 12 or 12
        if minute == "00":
            return f"{hour_12} {suffix}"
        return f"{hour_12}:{minute} {suffix}"
    return value


def summarize_call(runtime: Dict[str, Any], transcript: List[Dict[str, Any]], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    context = context or {}
    booking_data = runtime.get("booking_data", {})
    summary_parts: List[str] = []

    intent = runtime.get("intent", "unknown")
    if intent and intent != "unknown":
        summary_parts.append(f"Primary intent: {intent}.")

    if booking_data.get("specialization"):
        summary_parts.append(f"Specialization: {booking_data['specialization']}.")
    if booking_data.get("date"):
        summary_parts.append(f"Preferred date: {booking_data['date']}.")
    if booking_data.get("time"):
        summary_parts.append(f"Preferred time: {booking_data['time']}.")
    if booking_data.get("patient_name"):
        summary_parts.append(f"Patient name: {booking_data['patient_name']}.")
    if booking_data.get("patient_phone"):
        summary_parts.append(f"Patient phone captured.")

    booking_result = runtime.get("booking_result") or {}
    if booking_result.get("appointment_id"):
        summary_parts.append(f"Appointment booked successfully with ID {booking_result['appointment_id']}.")
    elif runtime.get("current_stage") == "booking_error":
        summary_parts.append("Booking could not be completed and was escalated for manual follow-up.")
    elif runtime.get("current_stage") == "urgent_case":
        summary_parts.append("Urgent/medical-advice path was triggered.")

    if runtime.get("fallback_count", 0):
        summary_parts.append(f"Fallbacks used: {runtime['fallback_count']}.")
    if runtime.get("interruption_count", 0):
        summary_parts.append(f"Interruptions: {runtime['interruption_count']}.")

    duration_ms = runtime.get("stage_durations_ms", {})
    if duration_ms:
        summary_parts.append(
            "Latency snapshot: "
            + ", ".join(f"{stage} {ms}ms" for stage, ms in list(duration_ms.items())[:4])
            + "."
        )

    if context.get("clinic_name"):
        summary_parts.append(f"Clinic: {context['clinic_name']}.")

    if not summary_parts:
        summary_parts.append("Caller interacted with the clinic voice bot.")

    return {
        "call_summary": " ".join(summary_parts),
        "conversation_state": {
            "intent": intent,
            "stage": runtime.get("current_stage", "initial"),
            "booking_data": booking_data,
            "fallback_count": runtime.get("fallback_count", 0),
            "interruption_count": runtime.get("interruption_count", 0),
            "silence_prompts": runtime.get("silence_prompts", 0),
        },
        "telemetry": {
            "stage_durations_ms": runtime.get("stage_durations_ms", {}),
            "external_calls": runtime.get("external_calls", []),
        },
        "intent": intent,
    }


def render_clinic_context(snapshot: Dict[str, Any]) -> str:
    doctors = snapshot.get("doctors", [])
    availability = snapshot.get("availability", [])
    
    # Hardcoded rich doctor bios for testing
    doctor_bios = {
        "Dr. Davis": "Dr. Davis has 15 years of experience in Pediatrics. He holds an MD from Harvard Medical School and has successfully treated over 10,000 cases. Known for his friendly approach with children.",
        "Dr. Jane Smith": "Dr. Jane Smith is our senior General Practitioner with 20 years of experience. She completed her residency at Johns Hopkins and specializes in holistic and preventive medicine. She has managed over 25,000 patient cases.",
        "Dr. Jones": "Dr. Jones is a leading Cardiologist with 12 years of experience. He graduated from Stanford University and has performed over 500 successful cardiac procedures. He specializes in advanced heart disease management."
    }

    doctor_lines = []
    for doctor in doctors[:6]:
        name = doctor.get('name', 'Unknown')
        spec = doctor.get('specialization', 'General')
        bio = doctor_bios.get(name, f"Experienced in {spec}.")
        doctor_lines.append(f"- {name} ({spec}): {bio}")
        
    lines = [
        f"CLINIC NAME: {snapshot.get('clinic_name', 'City Health Clinic')}",
        "ADDRESS: 123 Wellness Avenue, Medical District, New York,10001",
        f"TIMEZONE: {snapshot.get('timezone', 'UTC')}",
        "",
        "HOSPITAL FAQ & REVIEWS:",
        "- Rating: 4.8/5 stars on HealthGrades with over 2,000 positive reviews.",
        "- Goodwill: City Health Clinic has been serving the community for over 25 years and is recognized as a center of excellence for patient care and advanced medical treatments.",
        "- Facilities: State-of-the-art diagnostic labs, 24/7 emergency support, and comfortable patient lounges.",
        "",
        "Use the snapshot below to answer quickly and avoid repeated backend calls.",
        "BOOKABLE DOCTORS:",
        *doctor_lines,
        ""
    ]

    for doctor in availability[:4]:
        slots = ", ".join(doctor.get("available_slots", [])[:4]) or "No slots"
        lines.append(
            f"Availability for {doctor.get('name')} ({doctor.get('specialization')}): {slots}"
        )

    return "\n".join(lines)


class ClinicBackendClient:
    def __init__(
        self,
        backend_url: str = DEFAULT_BACKEND_URL,
        bot_api_key: Optional[str] = None,
        cache_ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS,
    ) -> None:
        self.backend_url = backend_url.rstrip("/")
        self.bot_api_key = bot_api_key or os.getenv("BOT_API_KEY")
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Dict[str, BackendCacheEntry] = {}

    def _headers(self) -> Dict[str, str]:
        headers = {"content-type": "application/json"}
        if self.bot_api_key:
            headers["x-bot-api-key"] = self.bot_api_key
        return headers

    def _cache_key(self, prefix: str, *parts: Any) -> str:
        return ":".join([prefix, *[str(part) for part in parts]])

    async def _request(self, method: str, path: str, *, params: Optional[Dict[str, Any]] = None, json_body: Optional[Dict[str, Any]] = None, retries: int = 1) -> Dict[str, Any]:
        url = f"{self.backend_url}{path}"
        timeout = aiohttp.ClientTimeout(total=6)
        last_error: Optional[Exception] = None
        for attempt in range(retries + 1):
            try:
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.request(
                        method,
                        url,
                        params=params,
                        json=json_body,
                        headers=self._headers(),
                    ) as response:
                        if response.status >= 400:
                            text = await response.text()
                            raise RuntimeError(f"{method} {path} failed with {response.status}: {text}")
                        try:
                            return await response.json()
                        except Exception:
                            return {"data": await response.text()}
            except Exception as exc:
                last_error = exc
                if attempt >= retries:
                    raise
                await asyncio.sleep(0.15 * (attempt + 1))
        raise last_error or RuntimeError(f"Failed request to {path}")

    def _read_cache(self, key: str) -> Optional[Dict[str, Any]]:
        entry = self._cache.get(key)
        if not entry:
            return None
        if asyncio.get_event_loop().time() > entry.expires_at:
            self._cache.pop(key, None)
            return None
        return entry.value

    def _write_cache(self, key: str, value: Dict[str, Any]) -> None:
        self._cache[key] = BackendCacheEntry(
            value=value,
            expires_at=asyncio.get_event_loop().time() + self.cache_ttl_seconds,
        )

    async def get_doctors(self, refresh: bool = False) -> Dict[str, Any]:
        cache_key = self._cache_key("doctors")
        if not refresh:
            cached = self._read_cache(cache_key)
            if cached is not None:
                return cached
        response = await self._request("GET", "/appointments/doctors", retries=1)
        data = response.get("data", response)
        result = {"doctors": data if isinstance(data, list) else []}
        self._write_cache(cache_key, result)
        return result

    async def get_available_slots(self, doctor_id: int, date: str, refresh: bool = False) -> Dict[str, Any]:
        cache_key = self._cache_key("slots", doctor_id, date)
        if not refresh:
            cached = self._read_cache(cache_key)
            if cached is not None:
                return cached
        response = await self._request(
            "GET",
            "/appointments/slots",
            params={"doctorId": doctor_id, "date": date},
            retries=1,
        )
        data = response.get("data", response)
        slots = data if isinstance(data, list) else response.get("available_slots", [])
        result = {"date": date, "available_slots": slots}
        self._write_cache(cache_key, result)
        return result

    async def get_clinic_context(self, date: Optional[str] = None, days_ahead: int = 3, refresh: bool = False) -> Dict[str, Any]:
        target_date = date or datetime.utcnow().date().isoformat()
        cache_key = self._cache_key("context", target_date, days_ahead)
        if not refresh:
            cached = self._read_cache(cache_key)
            if cached is not None:
                return cached

        try:
            response = await self._request(
                "GET",
                "/appointments/context",
                params={"date": target_date, "daysAhead": days_ahead},
                retries=1,
            )
            data = response.get("data", response)
            if isinstance(data, dict) and data:
                self._write_cache(cache_key, data)
                return data
        except Exception as exc:
            logger.warning(f"Clinic context endpoint unavailable, falling back to local aggregation: {exc}")

        doctors_response = await self.get_doctors(refresh=refresh)
        doctors = [doctor for doctor in doctors_response.get("doctors", []) if doctor.get("id")]
        availability = await asyncio.gather(
            *[
                self.get_available_slots(int(doctor.get("id", 0)), target_date, refresh=refresh)
                for doctor in doctors[:8]
            ]
        )

        grouped = []
        for doctor, slot_info in zip(doctors[:8], availability):
            grouped.append(
                {
                    "doctor_id": int(doctor.get("id", 0)),
                    "name": doctor.get("name", ""),
                    "specialization": doctor.get("specialization") or "General",
                    "working_hours_start": doctor.get("working_hours_start", "09:00"),
                    "working_hours_end": doctor.get("working_hours_end", "17:00"),
                    "working_days": doctor.get("working_days", []),
                    "available_slots": (slot_info.get("available_slots") or [])[:6],
                    "alternative_slots": {},
                    "recommended_slots": (slot_info.get("available_slots") or [])[:3],
                }
            )

        fallback = {
            "clinic_name": "City Health Clinic",
            "timezone": "UTC",
            "date": target_date,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "doctors": doctors,
            "availability": grouped,
            "best_matches": sorted(grouped, key=lambda item: len(item.get("available_slots", [])), reverse=True)[:3],
            "clinic_hours": {
                "monday_to_friday": "08:00 - 18:00",
                "saturday": "09:00 - 16:00",
                "sunday": "Closed",
            },
            "next_best_dates": {},
        }
        self._write_cache(cache_key, fallback)
        return fallback

    async def lookup_appointments(self, phone: str) -> List[Dict[str, Any]]:
        try:
            response = await self._request("GET", f"/appointments/lookup/{phone}", retries=1)
            data = response.get("data", response)
            if isinstance(data, list):
                return data
            return []
        except Exception as exc:
            logger.error(f"Failed to lookup appointments for {phone}: {exc}")
            return []

    async def update_appointment(self, appointment_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        response = await self._request("PUT", f"/appointments/{appointment_id}", json_body=payload, retries=1)
        data = response.get("data", response)
        return {"success": True, "raw": data}

    async def book_appointment(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        response = await self._request("POST", "/appointments", json_body=payload, retries=1)
        data = response.get("data", response)
        return {"success": True, "appointment_id": data.get("id") if isinstance(data, dict) else None, "raw": data}

    async def ingest_call(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        response = await self._request("POST", "/calls/ingest", json_body=payload, retries=0)
        return response
