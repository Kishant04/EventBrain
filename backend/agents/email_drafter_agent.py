import json

from backend.gemini_client import call_gemini

SYSTEM_PROMPT = """
You are a professional email writer for Malaysian corporate event bookings.
You receive an event brief and a list of 3 vendors to contact.
Write one inquiry email per vendor. Keep each email under 120 words.
Be professional, mention the event date, pax count, and reference
their specific speciality in the email body.
Respond ONLY with valid JSON, no markdown.

{
  "draft_emails": [
    {
      "vendor_id": integer,
      "vendor_name": string,
      "to_email": string,
      "contact_email": string,
      "subject": string,
      "body": string
    }
  ]
}
"""


def _clean_json(raw: str) -> dict:
  # Converts fenced/unstyled model output into a validated JSON dict.
    clean = raw.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


REFINE_SYSTEM_PROMPT = """
You refine Malaysian corporate event inquiry emails.
Rewrite the subject and body in the requested tone while preserving the event facts,
the recipient vendor, and the original intent. Keep the email concise and professional.
Respond ONLY with valid JSON, no markdown.

{
  "subject": string,
  "body": string
}
"""


def _merge_contact_emails(draft_emails: list[dict], ranked_vendors: list[dict]) -> list[dict]:
  # Backfills delivery addresses from ranked vendor records when missing.
    vendor_lookup = {vendor.get("vendor_id"): vendor for vendor in ranked_vendors}
    merged = []

    for draft in draft_emails:
        vendor = vendor_lookup.get(draft.get("vendor_id"), {})
        merged.append(
            {
                **draft,
                "contact_email": vendor.get("contact_email") or draft.get("contact_email") or draft.get("to_email"),
                "to_email": vendor.get("contact_email") or draft.get("to_email"),
            }
        )

    return merged


async def email_drafter_agent(intake: dict, vendor_ranker_output: dict) -> dict:
  # Generates concise inquiry drafts for each ranked vendor option.
    ranked = vendor_ranker_output.get("ranked_vendors", [])

    message = f"""
    Event brief: {json.dumps(intake)}
    Ranked vendors to contact: {json.dumps(ranked)}

    Draft one inquiry email per ranked vendor.
    """

    raw = await call_gemini(SYSTEM_PROMPT, message)
    parsed = _clean_json(raw)
    parsed["draft_emails"] = _merge_contact_emails(parsed.get("draft_emails", []), ranked)
    return parsed


async def refine_email_draft(vendor_name: str, contact_email: str, subject: str, body: str, tone: str) -> dict:
  # Rewrites one draft in a requested tone without changing event facts.
    message = f"""
    Vendor: {vendor_name}
    Contact email: {contact_email}
    Requested tone: {tone}
    Current subject: {subject}
    Current body: {body}

    Rewrite the subject and body in the requested tone.
    """
    raw = await call_gemini(REFINE_SYSTEM_PROMPT, message)
    return _clean_json(raw)