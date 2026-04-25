import json

from backend.gemini_client import call_gemini

SYSTEM_PROMPT = """
You are an event intake parser for Malaysian corporate events.
Extract info from Malay, English, or Manglish input.
Respond ONLY with valid JSON, no markdown, no explanation.

{
  "pax": integer,
  "budget_rm": integer,
  "budget_per_pax": integer,
  "event_type": "outdoor_teambuilding" | "indoor_teambuilding" | "annual_dinner" | "indoor_workshop" | "hybrid_teambuilding",
  "location": string,
  "date_requested": "YYYY-MM-DD" or "unknown",
  "lead_time_days": integer or null,
  "budget_risk": "low" | "medium" | "high",
  "budget_flag_message": string or null,
  "missing_fields": []
}

Budget risk: outdoor below RM55/pax = high, RM55-65 = medium, above RM65 = low.
Indoor below RM40/pax = high, RM40-55 = medium, above RM55 = low.
"""


def _clean_json(raw: str) -> dict:
  # Strips code fences and parses strict JSON from model output.
    clean = raw.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


async def intake_agent(user_input: str, today: str) -> dict:
  # Extracts normalized event requirements from free-form user text.
    message = f"Today's date is {today}. User request: {user_input}"
    raw = await call_gemini(SYSTEM_PROMPT, message)
    return _clean_json(raw)