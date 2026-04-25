import json

from backend.gemini_client import call_gemini

SYSTEM_PROMPT = """
You are a senior event planning strategist for Malaysian companies.
You receive a full event brief, ranked vendors, risk assessment,
and drafted emails. Produce exactly 3 execution paths.
Respond ONLY with valid JSON, no markdown.

You MUST respond with ONLY valid JSON in exactly this format:
{
  "recommended_path": <"conservative" | "balanced" | "aggressive">,
  "paths": [
    {
      "type": "conservative",
      "label": <short label like "Play it safe">,
      "vendor_id": <integer>,
      "vendor_name": <string>,
      "pax": <integer>,
      "total_cost_rm": <integer>,
      "risk_level": <"low" | "medium" | "high">,
      "tradeoff": <one sentence what you gain and what you give up>
    },
    {
      "type": "balanced",
      ...
    },
    {
      "type": "aggressive",
      ...
    }
  ],
  "summary": <2 sentence overall recommendation>
}
"""


def _clean_json(raw: str) -> dict:
  # Parses the final decision payload with conservative/balanced/aggressive paths.
    clean = raw.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


async def decision_agent(intake: dict, vendor: dict, risk: dict, email: dict) -> dict:
  # Synthesizes prior agent outputs into actionable strategy options.
    message = f"""
    Event brief: {json.dumps(intake)}
  Ranked vendors: {json.dumps(vendor)}
    Risk assessment: {json.dumps(risk)}
  Drafted emails: {json.dumps(email)}

    Generate 3 execution paths.
    """

    raw = await call_gemini(SYSTEM_PROMPT, message)
    return _clean_json(raw)