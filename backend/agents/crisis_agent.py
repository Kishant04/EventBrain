import json

from backend.db import get_all_vendors
from backend.gemini_client import call_gemini

SYSTEM_PROMPT = """
You are an emergency event recovery specialist.
A vendor just cancelled. Find replacements and draft urgent emails.
Respond ONLY with valid JSON, no markdown.

{
  "situation_summary": one sentence,
  "replacement_vendors": [
    {
      "vendor_id": integer,
      "vendor_name": string,
      "price_per_pax": integer,
      "why_viable": one sentence
    }
  ],
  "urgent_emails": [
    {
      "vendor_id": integer,
      "to_email": string,
      "subject": string must contain URGENT,
      "body": string under 120 words
    }
  ],
  "revised_plan": 2 sentences
}

You MUST respond with ONLY valid JSON in exactly this format:
{
  "situation_summary": <one sentence describing what happened>,
  "replacement_vendors": [
    {
      "vendor_id": <integer>,
      "vendor_name": <string>,
      "price_per_pax": <integer>,
      "why_viable": <one sentence>
    }
  ],
  "urgent_emails": [
    {
      "vendor_id": <integer>,
      "to_email": <string>,
      "subject": <string>,
      "body": <string>
    }
  ],
  "revised_plan": <2 sentences on how to proceed>
}
"""


def _clean_json(raw: str) -> dict:
  # Normalizes Gemini crisis output into strict JSON for frontend rendering.
    clean = raw.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


def _fallback_crisis_output(remaining: list[dict], intake: dict) -> dict:
  # Builds a deterministic recovery plan when LLM calls are rate-limited.
    ranked = sorted(remaining, key=lambda v: v.get("rating", 0), reverse=True)[:3]
    pax = intake.get("pax") or "the planned"
    event_date = intake.get("date_requested") or "the requested"

    replacement_vendors = [
        {
            "vendor_id": vendor.get("id"),
            "vendor_name": vendor.get("name", "Unknown Vendor"),
            "price_per_pax": vendor.get("price_per_pax", 0),
            "why_viable": "High-rated available alternative selected by fallback planner.",
        }
        for vendor in ranked
    ]

    urgent_emails = []
    for vendor in ranked:
        contact = vendor.get("email") or vendor.get("contact_email") or ""
        name = vendor.get("name", "Vendor")
        urgent_emails.append(
            {
                "vendor_id": vendor.get("id"),
                "to_email": contact,
                "subject": f"URGENT: Immediate Support Needed for {pax} Pax Event",
                "body": (
                    f"Hi {name} team, we have an urgent vendor cancellation for {pax} pax on {event_date}. "
                    "Please confirm availability, pricing, and earliest confirmation slot today. Thank you."
                ),
            }
        )

    return {
        "situation_summary": "Primary vendor cancelled. Temporary fallback plan generated due to LLM rate limits.",
        "replacement_vendors": replacement_vendors,
        "urgent_emails": urgent_emails,
        "revised_plan": "Proceed with the top available replacement immediately and lock confirmation in writing. Re-run crisis planning once API quota resets for refined recommendations.",
    }


async def crisis_agent(session_vendor_output: dict, cancelled_vendor_id: int, intake: dict) -> dict:
  # Recomputes replacements and urgent outreach after a vendor cancellation event.
    all_vendors = get_all_vendors()
    remaining = [v for v in all_vendors if v["id"] != cancelled_vendor_id]

    message = f"""
    Original event: {json.dumps(intake)}
    Previous vendor recommendations: {json.dumps(session_vendor_output)}
    Cancelled vendor ID: {cancelled_vendor_id}
    Available replacement vendors: {json.dumps(remaining)}
    Crisis email received: Vendor has cancelled due to unforeseen circumstances.
    Find 3 replacement vendors and draft urgent emails immediately.
    """

    try:
        raw = await call_gemini(SYSTEM_PROMPT, message)
        return _clean_json(raw)
    except Exception as exc:
        if "429" in str(exc) or "Too Many Requests" in str(exc):
            return _fallback_crisis_output(remaining, intake)
        raise