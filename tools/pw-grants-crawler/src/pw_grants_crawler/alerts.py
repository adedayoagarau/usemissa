from __future__ import annotations

import hashlib
import html
from dataclasses import dataclass
from datetime import date
from typing import Any

import httpx


def recipient_hash(recipient: str) -> str:
    return hashlib.sha256(recipient.strip().casefold().encode("utf-8")).hexdigest()


@dataclass(frozen=True, slots=True)
class AlertResult:
    status: str
    provider_message_id: str | None = None
    error: str | None = None


def send_daily_digest(
    *,
    api_key: str | None,
    sender: str | None,
    recipient: str | None,
    digest_date: date,
    summary: dict[str, Any],
    dashboard_url: str | None,
) -> AlertResult:
    if not api_key or not sender or not recipient:
        return AlertResult(status="skipped", error="RESEND_API_KEY, RESEND_FROM, or GARY_REVIEW_EMAIL is not configured")
    statuses = summary.get("statuses") or {}
    rows = "".join(
        f"<tr><td style='padding:6px 12px'>{html.escape(str(key).replace('_', ' ').title())}</td>"
        f"<td style='padding:6px 12px;text-align:right'><strong>{int(value)}</strong></td></tr>"
        for key, value in sorted(statuses.items())
    ) or "<tr><td style='padding:6px 12px'>No review changes</td><td></td></tr>"
    link = f"<p><a href='{html.escape(dashboard_url)}'>Open Gary control room</a></p>" if dashboard_url else ""
    body = (
        f"<h1>Gary morning review · {digest_date.isoformat()}</h1>"
        "<p>Gary completed the scheduled AI review and publication pass.</p>"
        f"<table style='border-collapse:collapse'>{rows}</table>"
        f"<p>Estimated DeepSeek cost: ${float(summary.get('estimated_cost_usd', 0)):.4f}</p>{link}"
    )
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "from": sender,
                "to": [recipient],
                "subject": f"Gary morning review · {digest_date.isoformat()}",
                "html": body,
            },
            timeout=30,
        )
        if response.is_error:
            detail = response.text.strip().replace("\n", " ")[:500]
            return AlertResult(status="failed", error=f"Resend HTTP {response.status_code}: {detail}")
        message_id = response.json().get("id")
        return AlertResult(status="sent", provider_message_id=str(message_id) if message_id else None)
    except Exception as error:
        return AlertResult(status="failed", error=str(error)[:1000])
