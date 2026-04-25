import asyncio

import socketio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.db import get_session, supabase
from backend.agents.email_drafter_agent import refine_email_draft
from backend.orchestrator import run_crisis, run_pipeline, stop_pipeline
from backend.socket_manager import sio

fastapi_app = FastAPI()
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
BACKGROUND_PIPELINE_TASKS: set[asyncio.Task] = set()


# Keep references to background tasks so they are not garbage-collected mid-run.
def _track_background_pipeline(task: asyncio.Task) -> None:
    BACKGROUND_PIPELINE_TASKS.add(task)
    task.add_done_callback(BACKGROUND_PIPELINE_TASKS.discard)


@fastapi_app.post("/api/run")
async def run(body: dict):
    # Starts the full multi-agent pipeline as a detached background task.
    if "user_input" not in body or "socket_id" not in body:
        raise HTTPException(status_code=400, detail="user_input and socket_id are required")

    task = asyncio.create_task(run_pipeline(body["user_input"], sio, body["socket_id"]))
    _track_background_pipeline(task)
    return {"status": "started"}


@fastapi_app.post("/api/crisis")
async def crisis(body: dict):
    # Triggers the crisis recovery branch using persisted session outputs.
    required = {"session_id", "cancelled_vendor_id", "socket_id"}
    if not required.issubset(set(body.keys())):
        raise HTTPException(status_code=400, detail="session_id, cancelled_vendor_id, and socket_id are required")

    session = (
        supabase.table("sessions")
        .select("*")
        .eq("id", body["session_id"])
        .execute()
        .data
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    row = session[0]
    await run_crisis(
        session_id=body["session_id"],
        cancelled_vendor_id=body["cancelled_vendor_id"],
        intake=row["intake_output"],
        vendor_output=row["vendor_output"],
        sio=sio,
        socket_id=body["socket_id"],
    )
    return {"status": "crisis_started"}


@fastapi_app.post("/api/stop")
async def stop(body: dict):
    # Requests cancellation for an active orchestration session.
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    stopped = stop_pipeline(session_id)
    if not stopped:
        raise HTTPException(status_code=404, detail="No active pipeline found for this session")

    return {"status": "stopping", "session_id": session_id}


@fastapi_app.post("/api/email/refine")
async def refine_email(body: dict):
    # Refines a single drafted vendor email while preserving core event facts.
    required = {"vendor_name", "contact_email", "subject", "body", "tone"}
    if not required.issubset(set(body.keys())):
        raise HTTPException(status_code=400, detail="vendor_name, contact_email, subject, body, and tone are required")

    refined = await refine_email_draft(
        vendor_name=body["vendor_name"],
        contact_email=body["contact_email"],
        subject=body["subject"],
        body=body["body"],
        tone=body["tone"],
    )
    return refined


@fastapi_app.get("/api/session/{session_id}")
async def session_details(session_id: str):
    # Returns the stored session record for dashboard/history lookups.
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session