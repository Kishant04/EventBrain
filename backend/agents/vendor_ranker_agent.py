import json

from backend.db import get_all_vendors, get_suitable_vendors
from backend.gemini_client import call_gemini

SYSTEM_PROMPT = """
You are a vendor selection specialist for Malaysian corporate events.
You receive an event brief and a pre-filtered list of suitable vendors.
Your only job is to rank the top 3 vendors and explain why each one fits.
Respond ONLY with valid JSON, no markdown, no explanation outside JSON.

{
  "ranked_vendors": [
    {
      "rank": 1,
      "vendor_id": integer,
      "vendor_name": string,
      "contact_email": string,
      "price_per_pax": integer,
      "estimated_total": integer,
      "rating": number,
      "speciality": string,
      "why_recommended": one sentence
    }
  ]
}

Rank based on: best value for budget, availability, rating, and suitability
for the event type. If budget is tight, prioritise lower cost vendors.
"""


def _clean_json(raw: str) -> dict:
    # Parses the model response into a JSON object expected by downstream agents.
    clean = raw.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


def _enrich_ranked_vendors(ranked_vendors: list[dict], vendor_source: list[dict]) -> list[dict]:
    # Merges DB-backed metadata into LLM-ranked vendor results.
    vendor_lookup = {vendor["id"]: vendor for vendor in vendor_source}
    enriched = []

    for vendor in ranked_vendors:
        vendor_id = vendor.get("vendor_id")
        source = vendor_lookup.get(vendor_id, {})
        enriched.append(
            {
                **vendor,
                "contact_email": source.get("email") or vendor.get("contact_email"),
                "rating": source.get("rating", vendor.get("rating")),
                "speciality": source.get("speciality") or vendor.get("speciality"),
            }
        )

    return enriched


async def vendor_ranker_agent(intake: dict) -> dict:
    # Produces top vendor recommendations using constraints plus LLM ranking.
    suitable = get_suitable_vendors(
        min_pax=intake["pax"],
        lead_time_days=intake.get("lead_time_days") or 30,
    )

    if not suitable:
        all_vendors = get_all_vendors()
        # Sort by rating desc and cap at 10 to keep prompt size manageable
        suitable = sorted(all_vendors, key=lambda v: v.get("rating", 0), reverse=True)[:10]

    message = f"""
    Event brief: {json.dumps(intake)}
    Pre-filtered vendors: {json.dumps(suitable)}

    Rank the top 3 vendors only.
    """

    raw = await call_gemini(SYSTEM_PROMPT, message)
    parsed = _clean_json(raw)
    parsed["ranked_vendors"] = _enrich_ranked_vendors(parsed.get("ranked_vendors", []), suitable)
    return parsed