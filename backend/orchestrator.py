import asyncio
import os
import time
import uuid
from datetime import datetime

from backend.agents.crisis_agent import crisis_agent
from backend.agents.decision_agent import decision_agent
from backend.agents.email_drafter_agent import email_drafter_agent
from backend.agents.intake_agent import intake_agent
from backend.agents.risk_agent import risk_agent
from backend.agents.vendor_ranker_agent import vendor_ranker_agent
from backend.db import create_session, log_agent, update_session, update_session_status


AGENT_TIMEOUT_SECONDS = int(os.getenv("AGENT_TIMEOUT_SECONDS", "300"))
ACTIVE_PIPELINES: dict[str, asyncio.Task] = {}


# Treats timeout/failed payloads as hard-stop conditions for pipeline flow.
def _is_failed_result(result: dict) -> bool:
    return result.get("status") in {"failed", "timeout"}


def stop_pipeline(session_id: str) -> bool:
    # Cancels a running asyncio task tracked under the given session id.
    task = ACTIVE_PIPELINES.get(session_id)
    if task is None or task.done():
        return False
    task.cancel()
    return True


async def _run_agent_step(
    *,
    session_id: str,
    agent_number: int,
    agent_name: str,
    sio,
    socket_id: str,
    coro,
    session_field: str | None = None,
):
    # Executes one agent step with timeout, logging, persistence, and socket updates.
    await sio.emit("agent_update", {"agent": agent_number, "status": "running"}, to=socket_id)
    start = time.time()

    try:
        result = await asyncio.wait_for(coro, timeout=AGENT_TIMEOUT_SECONDS)
        duration = int((time.time() - start) * 1000)

        if session_field:
            update_session(session_id, session_field, result)
        log_agent(session_id, agent_number, agent_name, "done", result, duration)

        await sio.emit(
            "agent_update",
            {"agent": agent_number, "status": "done", "data": result},
            to=socket_id,
        )
        return result
    except asyncio.TimeoutError:
        duration = int((time.time() - start) * 1000)
        error_payload = {
            "error": f"{agent_name} timed out after {AGENT_TIMEOUT_SECONDS}s",
            "status": "timeout",
        }
        if session_field:
            update_session(session_id, session_field, error_payload)
        log_agent(session_id, agent_number, agent_name, "timeout", error_payload, duration)
        await sio.emit(
            "agent_update",
            {"agent": agent_number, "status": "failed", "data": error_payload},
            to=socket_id,
        )
        return error_payload
    except Exception as exc:
        duration = int((time.time() - start) * 1000)
        error_payload = {
            "error": f"{type(exc).__name__}: {exc!r}",
            "status": "failed",
        }
        if session_field:
            update_session(session_id, session_field, error_payload)
        log_agent(session_id, agent_number, agent_name, "failed", error_payload, duration)
        await sio.emit(
            "agent_update",
            {"agent": agent_number, "status": "failed", "data": error_payload},
            to=socket_id,
        )
        return error_payload


async def run_pipeline(user_input: str, sio, socket_id: str):
    # Runs the main intake -> vendor/risk -> email -> decision orchestration pipeline.
    session_id = str(uuid.uuid4())
    today = datetime.now().strftime("%Y-%m-%d")

    create_session(session_id, user_input)
    ACTIVE_PIPELINES[session_id] = asyncio.current_task()

    try:
        await sio.emit("session_started", {"session_id": session_id}, to=socket_id)

        intake_result = await _run_agent_step(
            session_id=session_id,
            agent_number=1,
            agent_name="intake",
            sio=sio,
            socket_id=socket_id,
            coro=intake_agent(user_input, today),
            session_field="intake_output",
        )

        if _is_failed_result(intake_result):
            update_session_status(session_id, "failed")
            await sio.emit("pipeline_complete", {"session_id": session_id, "status": "failed"}, to=socket_id)
            return session_id

        vendor_task = _run_agent_step(
            session_id=session_id,
            agent_number=2,
            agent_name="vendor_ranker",
            sio=sio,
            socket_id=socket_id,
            coro=vendor_ranker_agent(intake_result),
            session_field="vendor_output",
        )
        risk_task = _run_agent_step(
            session_id=session_id,
            agent_number=2,
            agent_name="risk",
            sio=sio,
            socket_id=socket_id,
            coro=risk_agent(intake_result),
            session_field="risk_output",
        )

        vendor_result, risk_result = await asyncio.gather(vendor_task, risk_task)
        # Agent 2 branches run concurrently to reduce total end-to-end latency.

        if _is_failed_result(vendor_result):
            update_session_status(session_id, "failed")
            await sio.emit(
                "pipeline_complete",
                {
                    "session_id": session_id,
                    "status": "failed",
                    "reason": "vendor ranker failed",
                },
                to=socket_id,
            )
            return session_id

        if _is_failed_result(risk_result):
            update_session_status(session_id, "failed")
            await sio.emit(
                "pipeline_complete",
                {
                    "session_id": session_id,
                    "status": "failed",
                    "reason": "risk agent failed",
                },
                to=socket_id,
            )
            return session_id

        email_result = await _run_agent_step(
            session_id=session_id,
            agent_number=3,
            agent_name="email_drafter",
            sio=sio,
            socket_id=socket_id,
            coro=email_drafter_agent(intake_result, vendor_result),
            session_field=None,
        )

        if _is_failed_result(email_result):
            update_session_status(session_id, "failed")
            await sio.emit(
                "pipeline_complete",
                {
                    "session_id": session_id,
                    "status": "failed",
                    "reason": "email drafter failed",
                },
                to=socket_id,
            )
            return session_id

        decision_result = await _run_agent_step(
            session_id=session_id,
            agent_number=4,
            agent_name="decision",
            sio=sio,
            socket_id=socket_id,
            coro=decision_agent(intake_result, vendor_result, risk_result, email_result),
            session_field="decision_output",
        )

        if _is_failed_result(decision_result):
            update_session_status(session_id, "failed")
            await sio.emit("pipeline_complete", {"session_id": session_id, "status": "failed"}, to=socket_id)
            return session_id

        update_session_status(session_id, "completed")
        await sio.emit("pipeline_complete", {"session_id": session_id, "status": "completed"}, to=socket_id)
        return session_id
    except asyncio.CancelledError:
        update_session_status(session_id, "cancelled")
        await sio.emit(
            "pipeline_complete",
            {
                "session_id": session_id,
                "status": "cancelled",
                "reason": "Stop requested",
            },
            to=socket_id,
        )
        return session_id
    finally:
        ACTIVE_PIPELINES.pop(session_id, None)


async def run_crisis(session_id: str, cancelled_vendor_id: int, intake: dict, vendor_output: dict, sio, socket_id: str):
    # Executes crisis replacement planning and updates final crisis session status.
    update_session_status(session_id, "crisis")
    crisis_result = await _run_agent_step(
        session_id=session_id,
        agent_number=5,
        agent_name="crisis",
        sio=sio,
        socket_id=socket_id,
        coro=crisis_agent(vendor_output, cancelled_vendor_id, intake),
        session_field=None,
    )

    if _is_failed_result(crisis_result):
        update_session_status(session_id, "crisis_failed")
        return crisis_result

    update_session_status(session_id, "crisis_resolved")
    return crisis_result