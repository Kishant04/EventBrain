import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).resolve().with_name(".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_suitable_vendors(min_pax: int, lead_time_days: int):
    # Returns vendors that satisfy pax capacity and lead-time constraints.
    return (
        supabase.table("vendors")
        .select("*")
        .lte("min_pax", min_pax)
        .gte("max_pax", min_pax)
        .lte("lead_time_days_required", lead_time_days)
        .execute()
        .data
    )


def get_all_vendors():
    # Fetches the full vendor catalogue for fallback/ranking scenarios.
    return supabase.table("vendors").select("*").execute().data


def check_date_is_holiday(date_str: str):
    # Retrieves holiday metadata for a specific date if one exists.
    result = (
        supabase.table("holidays")
        .select("*")
        .eq("date", date_str)
        .execute()
        .data
    )
    return result[0] if result else None


def check_peak_season(date_str: str):
    # Flags whether a date falls in predefined high-demand peak season.
    result = (
        supabase.table("holidays")
        .select("*")
        .eq("date", date_str)
        .eq("peak_season", True)
        .execute()
        .data
    )
    return len(result) > 0


def create_session(session_id: str, user_input: str):
    # Creates a new orchestration session record before agent execution starts.
    supabase.table("sessions").insert(
        {
            "id": session_id,
            "user_input": user_input,
            "status": "processing",
        }
    ).execute()


def update_session(session_id: str, field: str, value: Any):
    # Persists intermediate agent outputs into a single session field.
    supabase.table("sessions").update({field: value}).eq("id", session_id).execute()


def update_session_status(session_id: str, status: str):
    # Updates the canonical session lifecycle status label.
    supabase.table("sessions").update({"status": status}).eq("id", session_id).execute()


def get_session(session_id: str):
    # Returns one session row by id for API retrieval endpoints.
    rows = supabase.table("sessions").select("*").eq("id", session_id).execute().data
    return rows[0] if rows else None


def log_agent(session_id: str, agent_number: int, agent_name: str, status: str, output: dict, duration_ms: int):
    # Appends an immutable execution log entry per agent run.
    supabase.table("agent_logs").insert(
        {
            "session_id": session_id,
            "agent_number": agent_number,
            "agent_name": agent_name,
            "status": status,
            "output_json": output,
            "duration_ms": duration_ms,
        }
    ).execute()