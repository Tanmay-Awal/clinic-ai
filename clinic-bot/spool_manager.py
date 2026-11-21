"""Spool and resilient ingestion manager for clinic bot calls.

Ensures that even if the backend or database is down when a call finishes:
1. The transcript and full metadata are saved to disk immediately before any network request.
2. Ingestion retries automatically with exponential backoff.
3. If all immediate attempts fail, the spooled file remains safely on disk (outbox pattern).
4. A background task continuously flushes pending spooled calls as soon as the backend recovers.
"""

import asyncio
import json
import os
import re
from typing import Dict, Any, Optional
from loguru import logger

SPOOL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "spool"))


def _sanitize_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", str(name or "unknown"))


def spool_call_payload(call_id: str, payload: Dict[str, Any]) -> str:
    """Save call payload to local disk immediately. Returns filepath."""
    os.makedirs(SPOOL_DIR, exist_ok=True)
    filename = f"call_{_sanitize_filename(call_id)}.json"
    filepath = os.path.join(SPOOL_DIR, filename)
    temp_filepath = f"{filepath}.tmp"
    try:
        with open(temp_filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        # Atomic replace
        os.replace(temp_filepath, filepath)
        logger.info(f"[SPOOL] Successfully spooled call data to {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"[SPOOL-ERROR] Failed writing spool file {filepath}: {e}")
        if os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception:
                pass
        return ""


def remove_spooled_call(call_id: str) -> bool:
    """Remove spooled call file once backend acknowledges ingestion."""
    filename = f"call_{_sanitize_filename(call_id)}.json"
    filepath = os.path.join(SPOOL_DIR, filename)
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"[SPOOL] Removed processed spool file {filepath}")
            return True
    except Exception as e:
        logger.warning(f"[SPOOL-WARN] Failed to delete spool file {filepath}: {e}")
    return False


async def resilient_ingest(client_or_func, payload: Dict[str, Any], max_retries: int = 4) -> bool:
    """
    Ingests call payload with local disk persistence and exponential backoff retry.
    
    1. Spools payload to disk first.
    2. Tries to ingest with retries.
    3. If succeeded, removes the file from disk.
    4. If all retries fail, leaves the file on disk for background retry worker.
    """
    call_id = payload.get("call_id", f"call_{int(asyncio.get_event_loop().time())}")
    filepath = spool_call_payload(call_id, payload)

    delay = 1.0
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[INGEST] Attempt {attempt}/{max_retries} for call {call_id}...")
            if hasattr(client_or_func, "ingest_call"):
                await client_or_func.ingest_call(payload)
            elif callable(client_or_func):
                await client_or_func(payload)
            else:
                raise ValueError("Invalid client or function provided for resilient_ingest")

            logger.info(f"[INGEST] Call {call_id} ingested successfully by backend.")
            if filepath:
                remove_spooled_call(call_id)
            return True
        except Exception as e:
            logger.warning(f"[INGEST-FAIL] Ingest attempt {attempt} failed for call {call_id}: {e}")
            if attempt < max_retries:
                await asyncio.sleep(delay)
                delay *= 2

    logger.error(
        f"[INGEST-SAVED] Backend unavailable after {max_retries} attempts for call {call_id}. "
        f"DATA IS PRESERVED ON DISK at: {filepath}. It will be flushed once backend is restored."
    )
    return False


async def flush_spool(client_or_func) -> int:
    """Scans SPOOL_DIR and attempts to send any pending call payloads to backend."""
    if not os.path.isdir(SPOOL_DIR):
        return 0

    files = [f for f in os.listdir(SPOOL_DIR) if f.startswith("call_") and f.endswith(".json")]
    if not files:
        return 0

    flushed_count = 0
    for filename in files:
        filepath = os.path.join(SPOOL_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                payload = json.load(f)

            call_id = payload.get("call_id")
            logger.info(f"[SPOOL-FLUSH] Retrying pending spooled call {call_id} from {filename}...")

            if hasattr(client_or_func, "ingest_call"):
                await client_or_func.ingest_call(payload)
            elif callable(client_or_func):
                await client_or_func(payload)

            remove_spooled_call(call_id)
            flushed_count += 1
            logger.info(f"[SPOOL-FLUSH-OK] Spooled call {call_id} successfully sent to backend.")
        except Exception as e:
            logger.warning(f"[SPOOL-FLUSH-ERR] Could not flush {filename}: {e}. Will retry on next cycle.")

    return flushed_count


async def start_spool_retry_worker(client_or_func, interval_seconds: int = 30):
    """Background loop that periodically retries sending any spooled calls."""
    logger.info(f"[SPOOL-WORKER] Starting resilient spool retry worker (interval: {interval_seconds}s)")
    while True:
        try:
            await flush_spool(client_or_func)
        except Exception as e:
            logger.error(f"[SPOOL-WORKER-ERR] Error in spool retry worker: {e}")
        await asyncio.sleep(interval_seconds)
