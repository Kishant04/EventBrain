import json

from backend.db import check_date_is_holiday, check_peak_season
from backend.gemini_client import call_gemini

SYSTEM_PROMPT = """
You are a risk assessment specialist for Malaysian corporate events.
Assess the risk of the event based on the information provided.

Malaysian context you must consider:
- April to October is monsoon/rain season in Klang Valley - outdoor events carry weather risk
- Public holidays and school holidays drive up vendor prices and reduce availability
- Less than 5 days lead time for any event over 50 pax is high risk
- Outdoor events with no indoor backup during rain season = automatic high risk flag

You MUST respond with ONLY valid JSON in exactly this format:
{
  "risk_score": <integer 1-10, where 10 is highest risk>,
  "risk_level": <"low" | "medium" | "high">,
  "risk_factors": [<list of specific risk strings>],
  "mitigations": [<list of specific mitigation suggestions>]
}
"""


def _clean_json(raw: str) -> dict:
  # Parses the model-generated risk payload as strict JSON.
    clean = raw.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


async def risk_agent(intake: dict) -> dict:
  # Combines intake data with holiday/season context to score execution risk.
    holiday_info = check_date_is_holiday(intake.get("date_requested", ""))
    is_peak = check_peak_season(intake.get("date_requested", ""))

    message = f"""
    Event details: {json.dumps(intake)}
    Is public holiday: {holiday_info is not None}
    Holiday details: {json.dumps(holiday_info)}
    Is peak season: {is_peak}
    """

    raw = await call_gemini(SYSTEM_PROMPT, message)
    return _clean_json(raw)