from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from html import escape as escape_html
from pathlib import Path
from typing import Any, Iterable

from psycopg.types.json import Jsonb

from .neon import NeonStore, _text


REVIEW_STATUSES = ("partial", "render_required", "conflict", "unavailable", "mismatch")
DECISION_CONTRACT = {
    "identity": ["same_call", "not_same_call", "unresolved"],
    "page_action": ["static_sufficient", "render_then_review", "retry_later", "unresolved"],
    "field_values": ["pw", "host", "unknown"],
}
TEXT_EXCERPT_LIMIT = 12_000
REVIEWABLE_FIELDS = {"deadline", "entry_fee", "cash_prize"}


def _json_value(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    return default


def _serializable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _serializable(child) for key, child in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serializable(child) for child in value]
    return value


def _excerpt(value: Any, limit: int = TEXT_EXCERPT_LIMIT) -> str:
    text = str(value or "")
    return text if len(text) <= limit else text[:limit] + "\n\n[excerpt truncated]"


def normalize_decision_record(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate one browser decision before it can become training evidence."""

    if not isinstance(raw, dict) or not raw.get("observation_id"):
        raise ValueError("decision requires observation_id")
    identity = raw.get("identity", "unresolved")
    if identity not in DECISION_CONTRACT["identity"]:
        raise ValueError(f"identity must be one of {DECISION_CONTRACT['identity']}")
    page_action = raw.get("page_action", "unresolved")
    if page_action not in DECISION_CONTRACT["page_action"]:
        raise ValueError(f"page_action must be one of {DECISION_CONTRACT['page_action']}")
    raw_fields = raw.get("fields") or raw.get("field_decisions") or {}
    if not isinstance(raw_fields, dict):
        raise ValueError("fields must be an object")
    fields = {
        str(field_name): value
        for field_name, value in raw_fields.items()
        if str(field_name) in REVIEWABLE_FIELDS and value in DECISION_CONTRACT["field_values"]
    }
    invalid_values = [
        field_name
        for field_name, value in raw_fields.items()
        if str(field_name) in REVIEWABLE_FIELDS and value not in DECISION_CONTRACT["field_values"]
    ]
    if invalid_values:
        raise ValueError(f"field decision is invalid for {invalid_values[0]}")
    return {
        "observation_id": str(raw["observation_id"]),
        "identity": identity,
        "page_action": page_action,
        "fields": fields,
        "notes": str(raw.get("notes") or "")[:5_000],
    }


def _page_payload(page: dict[str, Any]) -> dict[str, Any]:
    text = str(page.get("text_content") or page.get("text") or "")
    return {
        "id": page.get("id"),
        "role": page.get("role"),
        "requested_url": page.get("requested_url"),
        "final_url": page.get("final_url"),
        "status_code": page.get("status_code"),
        "content_type": page.get("content_type"),
        "title": page.get("title") or "",
        "text_excerpt": _excerpt(text),
        "error": page.get("error"),
        "rendered": bool(page.get("rendered", False)),
        "html_path": page.get("html_path"),
    }


def build_review_payload(
    *,
    run: dict[str, Any],
    observations: Iterable[dict[str, Any]],
    pages: Iterable[dict[str, Any]],
    conflicts: Iterable[dict[str, Any]],
    field_observations: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    """Build the browser-safe review contract from normalized Neon rows.

    The browser receives evidence excerpts and source URLs, never executable
    source HTML. Manual decisions are deliberately a separate client-side
    structure so exported labels can be ingested without changing evidence.
    """

    pages_by_observation: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for page in pages:
        observation_id = page.get("observation_id")
        if observation_id:
            pages_by_observation[str(observation_id)].append(_page_payload(page))

    conflicts_by_observation: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for conflict in conflicts:
        observation_id = conflict.get("observation_id")
        if observation_id:
            conflicts_by_observation[str(observation_id)].append(
                {
                    "source_page_id": conflict.get("source_page_id"),
                    "field_name": conflict.get("field_name"),
                    "host_value": conflict.get("host_value"),
                    "expected_value": conflict.get("expected_value"),
                    "detail": conflict.get("detail"),
                }
            )

    candidate_values: dict[str, dict[str, dict[str, list[str]]]] = defaultdict(
        lambda: defaultdict(lambda: {"pw": [], "host": []})
    )
    for field in field_observations:
        observation_id = field.get("observation_id")
        source = field.get("source")
        if not observation_id or source not in {"pw", "host"}:
            continue
        field_name = str(field.get("field_name") or "unknown")
        value = field.get("value")
        if value is None or str(value) in candidate_values[str(observation_id)][field_name][source]:
            continue
        candidate_values[str(observation_id)][field_name][source].append(str(value))

    queue: list[dict[str, Any]] = []
    for raw_observation in observations:
        observation = dict(raw_observation)
        observation_id = str(observation["id"])
        evidence = _json_value(observation.get("payload_json"), {})
        if not isinstance(evidence, dict):
            evidence = {}
        host_evidence = evidence.get("official_evidence") or {}
        if not isinstance(host_evidence, dict):
            host_evidence = {}
        observation_pages = pages_by_observation.get(observation_id, [])
        selected_meta = host_evidence.get("selected_page") or {}
        selected_path = selected_meta.get("html_path") if isinstance(selected_meta, dict) else None
        selected_page = next(
            (page for page in observation_pages if page.get("html_path") == selected_path),
            None,
        )
        if selected_page is None:
            selected_page = next(
                (page for page in observation_pages if page.get("role") == "official"),
                None,
            )
        host_fields = host_evidence.get("fields") or {}
        if not isinstance(host_fields, dict):
            host_fields = {}
        host_candidates = host_evidence.get("field_candidates") or {}
        if not isinstance(host_candidates, dict):
            host_candidates = {}
        canonical_fields = host_evidence.get("canonical_fields") or {}
        if not isinstance(canonical_fields, dict):
            canonical_fields = {}
        canonical_fields = {
            field_name: value
            for field_name, value in canonical_fields.items()
            if field_name in REVIEWABLE_FIELDS and value
        }
        column_canonical_fields = {
            "deadline": observation.get("canonical_deadline_text"),
            "entry_fee": observation.get("canonical_entry_fee"),
            "cash_prize": observation.get("canonical_cash_prize"),
        }
        for field_name, value in column_canonical_fields.items():
            if value and field_name not in canonical_fields:
                canonical_fields[field_name] = value
        canonical_source = (
            observation.get("canonical_source")
            or host_evidence.get("canonical_source")
            or "p_and_w"
        )
        canonical_reason = host_evidence.get("canonical_reason")

        page_action = "unresolved"
        status = observation.get("host_status") or "unavailable"
        if status == "render_required":
            page_action = "render_then_review"
        elif status == "unavailable":
            page_action = "retry_later"

        queue.append(
            {
                "id": observation_id,
                "opportunity_id": observation.get("opportunity_id"),
                "rank": observation.get("rank"),
                "status": status,
                "organizer": observation.get("organizer") or "",
                "title": observation.get("title") or "",
                "source_detail_url": observation.get("source_detail_url"),
                "official_website": observation.get("official_website"),
                "deadline": _serializable(observation.get("deadline")),
                "deadline_note": observation.get("deadline_note"),
                "entry_fee": observation.get("entry_fee"),
                "cash_prize": observation.get("cash_prize"),
                "genres": _json_value(observation.get("genres_json"), []),
                "tags": _json_value(observation.get("tags_json"), []),
                "description": _excerpt(observation.get("description"), 4_000),
                "full_text_excerpt": _excerpt(observation.get("full_text")),
                "match_score": observation.get("host_match_score"),
                "missing_fields": _json_value(observation.get("missing_fields_json"), []),
                "host": {
                    "fields": host_fields,
                    "field_candidates": host_candidates,
                    "canonical_source": canonical_source,
                    "canonical_fields": canonical_fields,
                    "canonical_reason": canonical_reason,
                    "missing_fields": host_evidence.get("missing_fields") or [],
                    "notes": host_evidence.get("notes") or [],
                    "discovered_urls": host_evidence.get("discovered_urls") or [],
                    "selected_page_id": selected_page.get("id") if selected_page else None,
                    "selected_page_url": selected_page.get("final_url") if selected_page else observation.get("official_website"),
                    "pages": observation_pages,
                },
                "conflicts": conflicts_by_observation.get(observation_id, []),
                "field_candidates": candidate_values.get(observation_id, {}),
                "initial_page_action": page_action,
            }
        )

    counts: dict[str, int] = defaultdict(int)
    for item in queue:
        counts[item["status"]] += 1

    payload = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "run": _serializable(run),
        "counts": dict(counts),
        "queue": queue,
        "decision_contract": DECISION_CONTRACT,
    }
    return _serializable(payload)


def _review_data_script(payload: dict[str, Any]) -> str:
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return data.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def _render_noscript_fallback(payload: dict[str, Any]) -> str:
    """Keep the queue visible in iOS/Files previews that disable JavaScript."""

    run = payload.get("run") or {}
    counts = payload.get("counts") or {}
    rows = []
    for item in payload.get("queue") or []:
        status = escape_html(item.get("status") or "review")
        title = escape_html(item.get("title") or "Untitled call")
        organizer = escape_html(item.get("organizer") or "Unknown organizer")
        deadline = escape_html(item.get("deadline") or "unknown")
        pw_url = escape_html(item.get("source_detail_url") or "#", quote=True)
        host_url = escape_html(item.get("official_website") or "#", quote=True)
        rows.append(
            f'<li><strong>{title}</strong><span>{organizer} · deadline {deadline} · {status}</span>'
            f' <a href="{pw_url}">P&amp;W</a> · <a href="{host_url}">host</a></li>'
        )
    summary = ", ".join(f"{escape_html(str(key))}: {escape_html(str(value))}" for key, value in counts.items())
    return (
        '<noscript><style>.layout{display:none!important}.noscript-fallback{display:block!important}'
        '.noscript-fallback li{margin:0 0 12px}.noscript-fallback span{display:block;color:#6f6872;font-size:12px}'
        '</style><section class="noscript-fallback" style="margin:0 clamp(18px,4vw,56px) 56px;padding:18px;border:1px solid #e7e0e8;border-radius:18px;background:#fff">'
        '<h2 style="margin:0 0 8px;color:#3f2a4b;font:700 24px/1.1 Georgia,serif">Open this file in Safari</h2>'
        '<p style="color:#6f6872">This iPhone file preview does not run the interactive controls. Use the share button and choose <strong>Open in Safari</strong> for filtering, decisions, and export.</p>'
        f'<p><strong>Run:</strong> {escape_html(run.get("id") or "unknown")} · <strong>Queue:</strong> {len(rows)} items · {summary}</p>'
        f'<ol>{"".join(rows)}</ol></section></noscript>'
    )


def render_review_html(payload: dict[str, Any]) -> str:
    """Render a self-contained, responsive review console."""

    data = _review_data_script(payload)
    noscript_fallback = _render_noscript_fallback(payload)
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gary review console</title>
  <style>
    :root {{
      --ink: #211d24;
      --muted: #6f6872;
      --line: #e7e0e8;
      --canvas: #fff;
      --wash: #faf8fb;
      --aubergine: #5a3f68;
      --aubergine-dark: #3f2a4b;
      --green: #1c7352;
      --amber: #9a6200;
      --red: #a33d43;
      --blue: #2d5f8b;
      --shadow: 0 12px 35px rgba(53, 36, 64, .08);
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; color: var(--ink); background: var(--wash); font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
    button, input, select, textarea {{ font: inherit; }}
    button {{ cursor: pointer; }}
    a {{ color: var(--aubergine); }}
    .topbar {{ display: flex; gap: 24px; align-items: flex-end; justify-content: space-between; padding: 28px clamp(18px, 4vw, 56px) 22px; background: var(--canvas); border-bottom: 1px solid var(--line); }}
    .eyebrow {{ margin: 0 0 5px; color: var(--aubergine); font-size: 11px; font-weight: 800; letter-spacing: .14em; }}
    h1 {{ margin: 0; color: var(--aubergine-dark); font: 700 clamp(24px, 4vw, 36px)/1.05 Georgia, serif; }}
    .lede {{ max-width: 720px; margin: 9px 0 0; color: var(--muted); }}
    .actions {{ display: flex; align-items: center; gap: 9px; flex-wrap: wrap; justify-content: flex-end; }}
    .button {{ border: 1px solid var(--aubergine); border-radius: 999px; padding: 9px 14px; color: white; background: var(--aubergine); font-weight: 700; }}
    .button.secondary {{ color: var(--aubergine); background: white; }}
    .file-label {{ display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: 999px; padding: 9px 14px; color: var(--aubergine); background: white; font-weight: 700; cursor: pointer; }}
    .file-label input {{ position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }}
    .stats {{ display: grid; grid-template-columns: repeat(6, minmax(110px, 1fr)); gap: 10px; padding: 18px clamp(18px, 4vw, 56px); }}
    .stat {{ min-height: 74px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--canvas); box-shadow: var(--shadow); }}
    .stat strong {{ display: block; color: var(--aubergine-dark); font-size: 24px; }}
    .stat span {{ color: var(--muted); font-size: 12px; }}
    .toolbar {{ display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 0 clamp(18px, 4vw, 56px) 16px; }}
    .toolbar input, .toolbar select {{ min-height: 40px; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; color: var(--ink); background: white; }}
    .toolbar input {{ flex: 1 1 260px; }}
    .queue-count {{ margin-left: auto; color: var(--muted); font-size: 12px; }}
    .layout {{ display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); min-height: 620px; margin: 0 clamp(18px, 4vw, 56px) 56px; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: var(--canvas); box-shadow: var(--shadow); }}
    .queue {{ border-right: 1px solid var(--line); background: #fdfcfd; overflow: auto; max-height: calc(100vh - 250px); }}
    .queue-item {{ display: block; width: 100%; border: 0; border-bottom: 1px solid var(--line); padding: 14px 16px; text-align: left; color: var(--ink); background: transparent; }}
    .queue-item:hover, .queue-item.active {{ background: #f3edf5; }}
    .queue-item.active {{ box-shadow: inset 4px 0 0 var(--aubergine); }}
    .queue-item h3 {{ margin: 6px 0 3px; font-size: 14px; line-height: 1.25; }}
    .queue-item p {{ margin: 0; color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
    .badge {{ display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; font-size: 10px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; }}
    .badge.partial {{ color: var(--amber); background: #fff3d9; }}
    .badge.render_required {{ color: var(--blue); background: #e7f1fb; }}
    .badge.conflict {{ color: var(--red); background: #fdebed; }}
    .badge.unavailable, .badge.mismatch {{ color: #6d5967; background: #eee9ee; }}
    .detail {{ min-width: 0; padding: clamp(18px, 3vw, 34px); overflow: auto; max-height: calc(100vh - 250px); }}
    .detail-head {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }}
    .detail-head h2 {{ margin: 5px 0 3px; color: var(--aubergine-dark); font: 700 clamp(22px, 3vw, 31px)/1.1 Georgia, serif; }}
    .detail-head p {{ margin: 0; color: var(--muted); }}
    .links {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 13px; }}
    .link-pill {{ display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 7px 10px; color: var(--aubergine); background: white; font-size: 12px; text-decoration: none; }}
    .section {{ margin-top: 25px; }}
    .section h3 {{ margin: 0 0 10px; color: var(--aubergine-dark); font-size: 14px; }}
    .evidence-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }}
    .card {{ min-width: 0; border: 1px solid var(--line); border-radius: 14px; padding: 14px; background: white; }}
    .card h4 {{ margin: 0 0 10px; color: var(--aubergine); font-size: 13px; }}
    .field-grid {{ display: grid; grid-template-columns: minmax(100px, .7fr) minmax(0, 1fr); gap: 7px 12px; }}
    .field-grid dt {{ color: var(--muted); font-size: 12px; }}
    .field-grid dd {{ margin: 0; font-weight: 650; overflow-wrap: anywhere; }}
    .muted {{ color: var(--muted); }}
    .note {{ margin: 9px 0 0; border-left: 3px solid var(--line); padding-left: 10px; color: var(--muted); font-size: 12px; }}
    .canonical-note {{ margin: 9px 0 0; border-left: 3px solid var(--green); padding-left: 10px; color: var(--green); font-size: 12px; font-weight: 650; }}
    .conflict {{ border: 1px solid #f2cbd0; border-radius: 12px; margin: 8px 0; padding: 11px; background: #fff8f8; }}
    .conflict strong {{ color: var(--red); }}
    .comparison {{ width: 100%; border-collapse: collapse; }}
    .comparison th, .comparison td {{ border-bottom: 1px solid var(--line); padding: 9px 8px; text-align: left; vertical-align: top; }}
    .comparison th {{ color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }}
    .comparison td {{ overflow-wrap: anywhere; }}
    pre {{ max-height: 260px; margin: 10px 0 0; overflow: auto; white-space: pre-wrap; border-radius: 10px; padding: 11px; color: #433848; background: #faf7fb; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .decision {{ border: 1px solid #d8c8df; border-radius: 15px; padding: 15px; background: #fbf8fc; }}
    .decision-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }}
    .control {{ display: flex; flex-direction: column; gap: 5px; }}
    .control label {{ color: var(--muted); font-size: 12px; font-weight: 700; }}
    .control select, .control textarea {{ width: 100%; border: 1px solid var(--line); border-radius: 9px; padding: 8px; color: var(--ink); background: white; }}
    .control textarea {{ min-height: 76px; resize: vertical; }}
    .decision-actions {{ display: flex; align-items: center; gap: 10px; margin-top: 12px; }}
    .saved {{ color: var(--green); font-size: 12px; }}
    .page-card {{ margin-top: 9px; border-top: 1px solid var(--line); padding-top: 9px; }}
    .page-card summary {{ cursor: pointer; color: var(--aubergine); font-weight: 700; }}
    .empty {{ display: grid; place-items: center; min-height: 350px; padding: 30px; color: var(--muted); text-align: center; }}
    @media (max-width: 900px) {{
      .topbar {{ align-items: flex-start; flex-direction: column; }}
      .actions {{ justify-content: flex-start; }}
      .stats {{ grid-template-columns: repeat(3, minmax(100px, 1fr)); }}
      .layout {{ grid-template-columns: 1fr; }}
      .queue {{ max-height: 360px; border-right: 0; border-bottom: 1px solid var(--line); }}
      .detail {{ max-height: none; }}
    }}
    @media (max-width: 560px) {{
      .stats {{ grid-template-columns: repeat(2, minmax(100px, 1fr)); }}
      .evidence-grid, .decision-grid {{ grid-template-columns: 1fr; }}
      .queue-count {{ width: 100%; margin-left: 0; }}
    }}
  </style>
</head>
<body>
  <header class="topbar">
    <div>
      <p class="eyebrow">GARY / EVIDENCE REVIEW</p>
      <h1>Source comparison console</h1>
      <p class="lede">Review the calls Gary could not fully verify. Confirm whether the host page is the same call, choose the trusted field value, and export your decisions as training evidence.</p>
    </div>
    <div class="actions">
      <button class="button" id="export-decisions">Export decisions</button>
      <label class="file-label">Import decisions<input id="import-decisions" type="file" accept="application/json"></label>
    </div>
  </header>
  <section class="stats" id="stats"></section>
  <section class="toolbar">
    <input id="search" type="search" placeholder="Search organizer, title, or URL">
    <select id="status-filter" aria-label="Filter by host status"><option value="all">All review items</option></select>
    <select id="sort" aria-label="Sort review queue"><option value="status">Sort by status</option><option value="deadline">Sort by deadline</option><option value="organizer">Sort by organizer</option></select>
    <label class="muted"><input id="unresolved-only" type="checkbox"> unresolved only</label>
    <span class="queue-count" id="queue-count"></span>
  </section>
  <main class="layout">
    <aside class="queue" id="queue"></aside>
    <section class="detail" id="detail"><div class="empty">Select an item to review.</div></section>
  </main>
  {noscript_fallback}
  <script id="gary-review-data" type="application/json">{data}</script>
  <script>
    window.__GARY_REVIEW__ = JSON.parse(document.getElementById('gary-review-data').textContent);
    (() => {{
      const model = window.__GARY_REVIEW__;
      const run = model.run || {{}};
      const queue = model.queue || [];
      const storageKey = `gary-review:${{run.id || 'unknown'}}`;
      let saved = {{}};
      try {{ saved = JSON.parse(localStorage.getItem(storageKey) || '{{}}'); }} catch (_) {{ saved = {{}}; }}
      let selectedId = queue[0] ? queue[0].id : null;
      let filter = 'all';
      let query = '';
      let sort = 'status';
      let unresolvedOnly = false;
      const statusOrder = {{ conflict: 0, render_required: 1, partial: 2, unavailable: 3, mismatch: 4 }};
      const labels = {{
        partial: 'partial', render_required: 'render required', conflict: 'field conflict', unavailable: 'unavailable', mismatch: 'mismatch'
      }};
      const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({{ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }})[char]);
      const itemDecision = item => saved[item.id] || {{ identity: 'unresolved', page_action: item.initial_page_action || 'unresolved', fields: {{}}, notes: '' }};
      const isResolved = item => {{ const d = itemDecision(item); return d.identity !== 'unresolved' && (!item.conflicts.length || Object.values(d.fields || {{}}).every(value => value !== 'unknown')); }};
      const statusBadge = status => `<span class="badge ${{esc(status)}}">${{esc(labels[status] || status)}}</span>`;
      const fieldValue = (value, fallback = 'Not found') => value === null || value === undefined || value === '' ? `<span class="muted">${{fallback}}</span>` : esc(value);
      const fieldNames = ['deadline', 'entry_fee', 'cash_prize'];
      const statusCounts = () => {{
        const counts = {{}};
        queue.forEach(item => counts[item.status] = (counts[item.status] || 0) + 1);
        return counts;
      }};
      const renderStats = () => {{
        const counts = statusCounts();
        const stats = [
          ['Queue', queue.length, 'all review items'],
          ['Partial', counts.partial || 0, 'identity needs review'],
          ['Render', counts.render_required || 0, 'browser pass needed'],
          ['Conflicts', counts.conflict || 0, 'host page identified'],
          ['Unavailable', counts.unavailable || 0, 'retry or repair'],
          ['Decided', Object.keys(saved).filter(id => queue.some(item => item.id === id && isResolved(item))).length, 'saved locally']
        ];
        document.getElementById('stats').innerHTML = stats.map(([name, value, hint]) => `<div class="stat"><strong>${{value}}</strong><span>${{name}} · ${{hint}}</span></div>`).join('');
      }};
      const filteredQueue = () => {{
        const normalized = query.trim().toLowerCase();
        const filtered = queue.filter(item => {{
          const haystack = `${{item.organizer}} ${{item.title}} ${{item.source_detail_url || ''}} ${{item.official_website || ''}}`.toLowerCase();
          return (filter === 'all' || item.status === filter) && (!normalized || haystack.includes(normalized)) && (!unresolvedOnly || !isResolved(item));
        }});
        return filtered.sort((a, b) => {{
          if (sort === 'deadline') return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999'));
          if (sort === 'organizer') return `${{a.organizer}} ${{a.title}}`.localeCompare(`${{b.organizer}} ${{b.title}}`);
          return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || String(a.organizer).localeCompare(String(b.organizer));
        }});
      }};
      const renderQueue = () => {{
        const items = filteredQueue();
        document.getElementById('queue-count').textContent = `${{items.length}} shown · ${{queue.length}} total`;
        document.getElementById('queue').innerHTML = items.length ? items.map(item => {{
          const d = itemDecision(item);
          return `<button class="queue-item ${{item.id === selectedId ? 'active' : ''}}" data-id="${{esc(item.id)}}">${{statusBadge(item.status)}}<h3>${{esc(item.title)}}</h3><p>${{esc(item.organizer)}} · deadline ${{esc(item.deadline || 'unknown')}}</p><p>${{isResolved(item) ? 'Decision saved' : 'Needs your decision'}}</p></button>`;
        }}).join('') : '<div class="empty">No items match this filter.</div>';
        document.querySelectorAll('.queue-item').forEach(button => button.addEventListener('click', () => {{ selectedId = button.dataset.id; renderQueue(); renderDetail(); }}));
      }};
      const externalLink = (label, url) => url ? `<a class="link-pill" href="${{esc(url)}}" target="_blank" rel="noopener noreferrer">${{label}}</a>` : '';
      const renderFieldRows = item => fieldNames.map(field => `<tr><th>${{esc(field.replace('_', ' '))}}</th><td>${{fieldValue(item[field])}}</td><td>${{fieldValue((item.host.fields || {{}})[field])}}</td></tr>`).join('');
      const renderConflictRows = item => item.conflicts.length ? item.conflicts.map(conflict => `<div class="conflict"><strong>${{esc(conflict.field_name)}}</strong><div><b>Host:</b> ${{fieldValue(conflict.host_value)}} &nbsp; <b>P&amp;W:</b> ${{fieldValue(conflict.expected_value)}}</div><div class="muted">${{esc(conflict.detail || '')}}</div></div>`).join('') : '<p class="muted">No field-level disagreement was recorded.</p>';
      const renderPages = item => (item.host.pages || []).map(page => `<details class="page-card" ${{page.id === item.host.selected_page_id ? 'open' : ''}}><summary>${{esc(page.role)}} · ${{esc(page.title || page.final_url || page.requested_url)}} ${{page.rendered ? '(rendered)' : ''}}</summary><p class="muted">${{esc(page.status_code || '')}} · <a href="${{esc(page.final_url || page.requested_url)}}" target="_blank" rel="noopener noreferrer">open source</a></p>${{page.error ? `<p class="note">${{esc(page.error)}}</p>` : ''}}${{page.text_excerpt ? `<pre>${{esc(page.text_excerpt)}}</pre>` : '<p class="muted">No captured text.</p>'}}</details>`).join('');
      const renderDetail = () => {{
        const item = queue.find(candidate => candidate.id === selectedId);
        const detail = document.getElementById('detail');
        if (!item) {{ detail.innerHTML = '<div class="empty">No review item selected.</div>'; return; }}
        const d = itemDecision(item);
        const fieldControls = item.conflicts.map(conflict => {{
          const field = conflict.field_name;
          const current = (d.fields || {{}})[field] || 'unknown';
          return `<div class="control"><label for="field-${{esc(field)}}">Trust value for ${{esc(field)}}</label><select data-field="${{esc(field)}}" id="field-${{esc(field)}}"><option value="unknown" ${{current === 'unknown' ? 'selected' : ''}}>Unknown / keep in review</option><option value="pw" ${{current === 'pw' ? 'selected' : ''}}>P&amp;W</option><option value="host" ${{current === 'host' ? 'selected' : ''}}>Host</option></select></div>`;
        }}).join('');
        detail.innerHTML = `<div class="detail-head"><div><div>${{statusBadge(item.status)}}</div><h2>${{esc(item.title)}}</h2><p>${{esc(item.organizer)}} · match score ${{fieldValue(item.match_score, 'not available')}}</p><div class="links">${{externalLink('Open P&amp;W call', item.source_detail_url)}}${{externalLink('Open host site', item.official_website)}}${{externalLink('Open selected host page', item.host.selected_page_url)}}</div></div></div>
          <section class="section"><div class="evidence-grid"><div class="card"><h4>P&amp;W listing</h4><dl class="field-grid"><dt>Deadline</dt><dd>${{fieldValue(item.deadline)}}</dd><dt>Fee</dt><dd>${{fieldValue(item.entry_fee)}}</dd><dt>Prize</dt><dd>${{fieldValue(item.cash_prize)}}</dd><dt>Genres</dt><dd>${{fieldValue((item.genres || []).join(', '))}}</dd></dl>${{item.description ? `<p class="note">${{esc(item.description)}}</p>` : ''}}</div><div class="card"><h4>Host evidence</h4><dl class="field-grid"><dt>Deadline</dt><dd>${{fieldValue(item.host.fields.deadline)}}</dd><dt>Fee</dt><dd>${{fieldValue(item.host.fields.entry_fee)}}</dd><dt>Prize</dt><dd>${{fieldValue(item.host.fields.cash_prize)}}</dd><dt>Missing</dt><dd>${{fieldValue((item.host.missing_fields || []).join(', '), 'none recorded')}}</dd></dl>${{item.host.canonical_source === 'host' ? `<p class="canonical-note">Host is canonical for this matched call. P&amp;W remains attached as provenance.</p>` : ''}}${{(item.host.notes || []).map(note => `<p class="note">${{esc(note)}}</p>`).join('')}}</div></div></section>
          <section class="section"><h3>Side-by-side comparable fields</h3><table class="comparison"><thead><tr><th>Field</th><th>P&amp;W</th><th>Host</th></tr></thead><tbody>${{renderFieldRows(item)}}</tbody></table></section>
          <section class="section"><h3>Field conflicts</h3>${{renderConflictRows(item)}}</section>
          <section class="section"><h3>Captured host evidence</h3>${{renderPages(item) || '<p class="muted">No host page snapshot was stored.</p>'}}</section>
          <section class="section"><h3>Manual decision</h3><div class="decision"><div class="decision-grid"><div class="control"><label for="identity-decision">Is this the same call?</label><select id="identity-decision"><option value="unresolved" ${{d.identity === 'unresolved' ? 'selected' : ''}}>Unresolved</option><option value="same_call" ${{d.identity === 'same_call' ? 'selected' : ''}}>Yes — same call</option><option value="not_same_call" ${{d.identity === 'not_same_call' ? 'selected' : ''}}>No — different call</option></select></div><div class="control"><label for="page-action">What should Gary do next?</label><select id="page-action"><option value="unresolved" ${{d.page_action === 'unresolved' ? 'selected' : ''}}>Unresolved</option><option value="static_sufficient" ${{d.page_action === 'static_sufficient' ? 'selected' : ''}}>Static evidence is sufficient</option><option value="render_then_review" ${{d.page_action === 'render_then_review' ? 'selected' : ''}}>Render the page then review</option><option value="retry_later" ${{d.page_action === 'retry_later' ? 'selected' : ''}}>Retry or repair the URL</option></select></div>${{fieldControls}}</div><div class="control" style="margin-top:11px"><label for="review-notes">Notes for the next Gary rule</label><textarea id="review-notes" placeholder="What did you notice? e.g. host has a separate 2026 category page.">${{esc(d.notes || '')}}</textarea></div><div class="decision-actions"><button class="button" id="save-decision">Save decision</button><span class="saved" id="saved-message"></span></div></div></section>`;
        document.getElementById('save-decision').addEventListener('click', () => {{
          const fields = {{}};
          detail.querySelectorAll('[data-field]').forEach(control => fields[control.dataset.field] = control.value);
          saved[item.id] = {{ identity: document.getElementById('identity-decision').value, page_action: document.getElementById('page-action').value, fields, notes: document.getElementById('review-notes').value, updated_at: new Date().toISOString() }};
          localStorage.setItem(storageKey, JSON.stringify(saved));
          document.getElementById('saved-message').textContent = 'Saved on this device.';
          renderStats(); renderQueue();
        }});
      }};
      const exportDecisions = () => {{
        const output = {{ version: 1, run_id: run.id, source_id: run.source_id, exported_at: new Date().toISOString(), decisions: Object.entries(saved).map(([observation_id, decision]) => ({{ observation_id, ...decision }})) }};
        const blob = new Blob([JSON.stringify(output, null, 2)], {{ type: 'application/json' }});
        const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `gary-review-decisions-${{run.id || 'export'}}.json`; anchor.click(); URL.revokeObjectURL(url);
      }};
      document.getElementById('export-decisions').addEventListener('click', exportDecisions);
      document.getElementById('import-decisions').addEventListener('change', event => {{
        const file = event.target.files && event.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = () => {{
          try {{ const imported = JSON.parse(reader.result); if (imported.run_id && imported.run_id !== run.id) throw new Error('This file belongs to another run.'); (imported.decisions || []).forEach(decision => {{ if (decision.observation_id) saved[decision.observation_id] = decision; }}); localStorage.setItem(storageKey, JSON.stringify(saved)); renderStats(); renderQueue(); renderDetail(); alert('Decisions imported.'); }} catch (error) {{ alert(`Could not import decisions: ${{error.message}}`); }}
        }}; reader.readAsText(file);
      }});
      document.getElementById('search').addEventListener('input', event => {{ query = event.target.value; renderQueue(); }});
      document.getElementById('status-filter').addEventListener('change', event => {{ filter = event.target.value; renderQueue(); }});
      document.getElementById('sort').addEventListener('change', event => {{ sort = event.target.value; renderQueue(); }});
      document.getElementById('unresolved-only').addEventListener('change', event => {{ unresolvedOnly = event.target.checked; renderQueue(); }});
      const statusFilter = document.getElementById('status-filter'); Object.keys(statusCounts()).sort((a, b) => (statusOrder[a] ?? 9) - (statusOrder[b] ?? 9)).forEach(status => {{ const option = document.createElement('option'); option.value = status; option.textContent = `${{labels[status] || status}} (${{statusCounts()[status]}})`; statusFilter.appendChild(option); }});
      renderStats(); renderQueue(); renderDetail();
    }})();
  </script>
</body>
</html>'''


def _run_from_row(row: tuple[Any, ...]) -> dict[str, Any]:
    keys = ("id", "source_id", "mode", "status", "started_at", "completed_at", "error")
    return {key: _serializable(value) for key, value in zip(keys, row)}


def _load_latest_run(connection: Any, source_id: str, run_id: str | None) -> dict[str, Any]:
    if run_id:
        row = connection.execute(
            """
            SELECT id, source_id, mode, status, started_at, completed_at, error
            FROM gary_crawl_runs
            WHERE id = %s AND source_id = %s
            """,
            (run_id, source_id),
        ).fetchone()
    else:
        row = connection.execute(
            """
            SELECT id, source_id, mode, status, started_at, completed_at, error
            FROM gary_crawl_runs
            WHERE source_id = %s AND status = 'completed'
            ORDER BY completed_at DESC NULLS LAST
            LIMIT 1
            """,
            (source_id,),
        ).fetchone()
    if row is None:
        raise ValueError(f"No completed Gary run found for {source_id}")
    return _run_from_row(row)


def load_review_payload(
    connection: Any,
    *,
    source_id: str = "pw.org",
    run_id: str | None = None,
    statuses: Iterable[str] = REVIEW_STATUSES,
) -> dict[str, Any]:
    """Load non-verified evidence from Neon into the review contract."""

    run = _load_latest_run(connection, source_id, run_id)
    selected_statuses = tuple(dict.fromkeys(statuses))
    if not selected_statuses:
        raise ValueError("At least one review status is required")
    observation_rows = connection.execute(
        """
        SELECT observations.id, observations.opportunity_id, observations.rank,
               opportunities.organizer, opportunities.title, observations.source_detail_url,
               observations.official_website, observations.deadline, observations.deadline_note,
               observations.entry_fee, observations.cash_prize, observations.genres_json,
               observations.tags_json, observations.description, observations.full_text,
               observations.host_status, observations.host_match_score,
               observations.canonical_source, observations.canonical_deadline_text,
               observations.canonical_entry_fee, observations.canonical_cash_prize,
               observations.missing_fields_json, observations.payload_json
        FROM gary_call_observations AS observations
        JOIN gary_opportunities AS opportunities ON opportunities.id = observations.opportunity_id
        WHERE observations.run_id = %s AND observations.host_status = ANY(%s)
        ORDER BY observations.rank ASC, opportunities.organizer ASC, opportunities.title ASC
        """,
        (run["id"], list(selected_statuses)),
    ).fetchall()
    observations = []
    observation_ids = []
    for row in observation_rows:
        keys = (
            "id", "opportunity_id", "rank", "organizer", "title", "source_detail_url",
            "official_website", "deadline", "deadline_note", "entry_fee", "cash_prize",
            "genres_json", "tags_json", "description", "full_text", "host_status",
            "host_match_score", "canonical_source", "canonical_deadline_text",
            "canonical_entry_fee", "canonical_cash_prize", "missing_fields_json", "payload_json",
        )
        observations.append(dict(zip(keys, row)))
        observation_ids.append(str(row[0]))

    pages: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    field_observations: list[dict[str, Any]] = []
    if observation_ids:
        page_rows = connection.execute(
            """
            SELECT id, observation_id, role, requested_url, final_url, status_code,
                   content_type, title, text_content, error, rendered, html_path
            FROM gary_source_pages
            WHERE run_id = %s AND observation_id = ANY(%s)
            ORDER BY observation_id, role, id
            """,
            (run["id"], observation_ids),
        ).fetchall()
        for row in page_rows:
            keys = (
                "id", "observation_id", "role", "requested_url", "final_url", "status_code",
                "content_type", "title", "text_content", "error", "rendered", "html_path",
            )
            pages.append(dict(zip(keys, row)))
        conflict_rows = connection.execute(
            """
            SELECT observation_id, source_page_id, field_name, host_value, expected_value, detail
            FROM gary_field_conflicts
            WHERE observation_id = ANY(%s)
            ORDER BY observation_id, field_name
            """,
            (observation_ids,),
        ).fetchall()
        for row in conflict_rows:
            keys = ("observation_id", "source_page_id", "field_name", "host_value", "expected_value", "detail")
            conflicts.append(dict(zip(keys, row)))
        field_rows = connection.execute(
            """
            SELECT observation_id, field_name, value, source, selected, candidate_rank
            FROM gary_field_observations
            WHERE observation_id = ANY(%s)
            ORDER BY observation_id, field_name, source, candidate_rank
            """,
            (observation_ids,),
        ).fetchall()
        for row in field_rows:
            keys = ("observation_id", "field_name", "value", "source", "selected", "candidate_rank")
            field_observations.append(dict(zip(keys, row)))
    return build_review_payload(
        run=run,
        observations=observations,
        pages=pages,
        conflicts=conflicts,
        field_observations=field_observations,
    )


def write_review_html(payload: dict[str, Any], output_path: Path) -> Path:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_review_html(payload), encoding="utf-8")
    return output_path


def import_review_decisions(
    connection: Any,
    payload: dict[str, Any],
    *,
    reviewer: str = "local",
) -> int:
    """Persist exported browser labels without altering the source evidence."""

    run_id = payload.get("run_id")
    if not run_id:
        raise ValueError("decision export requires run_id")
    decisions = payload.get("decisions") or []
    if not isinstance(decisions, list):
        raise ValueError("decision export decisions must be a list")
    reviewer = str(reviewer or "local")[:120]
    observations = {
        str(row[0]): str(row[1])
        for row in connection.execute(
            "SELECT id, opportunity_id FROM gary_call_observations WHERE run_id = %s",
            (run_id,),
        ).fetchall()
    }
    imported = 0
    for raw_decision in decisions:
        decision = normalize_decision_record(raw_decision)
        observation_id = decision["observation_id"]
        opportunity_id = observations.get(observation_id)
        if opportunity_id is None:
            raise ValueError(f"decision references an observation outside run {run_id}: {observation_id}")
        decision_id = "review_" + hashlib.sha256(
            f"{run_id}\x1f{observation_id}\x1f{reviewer}".encode("utf-8")
        ).hexdigest()[:32]
        connection.execute(
            """
            INSERT INTO gary_review_decisions(
                id, run_id, observation_id, opportunity_id, reviewer,
                identity_decision, page_action, field_decisions_json, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (run_id, observation_id, reviewer) DO UPDATE SET
                identity_decision = excluded.identity_decision,
                page_action = excluded.page_action,
                field_decisions_json = excluded.field_decisions_json,
                notes = excluded.notes,
                updated_at = now()
            """,
            (
                decision_id,
                run_id,
                observation_id,
                opportunity_id,
                reviewer,
                decision["identity"],
                decision["page_action"],
                Jsonb(decision["fields"]),
                _text(decision["notes"]),
            ),
        )
        imported += 1
    return imported


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export Gary’s non-verified Neon evidence as an interactive HTML review console.")
    parser.add_argument("--source-id", default=os.environ.get("GARY_SOURCE_ID", "pw.org"))
    parser.add_argument("--run-id", default=None, help="Run to review; defaults to the latest completed run.")
    parser.add_argument("--output", type=Path, default=Path("outputs/gary-review/review.html"))
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    parser.add_argument("--import-decisions", type=Path, default=None)
    parser.add_argument("--reviewer", default=os.environ.get("GARY_REVIEWER", "local"))
    args = parser.parse_args(argv)
    if not args.database_url:
        raise SystemExit("--database-url or DATABASE_URL is required")
    store = NeonStore(args.database_url)
    store.ensure_schema()
    if args.import_decisions:
        payload = json.loads(args.import_decisions.read_text(encoding="utf-8"))
        with store.connect_factory(store.database_url) as connection:
            with connection.transaction():
                imported = import_review_decisions(connection, payload, reviewer=args.reviewer)
        print(f"Imported {imported} Gary review decision(s) into Neon")
        return 0
    with store.connect_factory(store.database_url) as connection:
        payload = load_review_payload(connection, source_id=args.source_id, run_id=args.run_id)
    output_path = write_review_html(payload, args.output)
    counts = ", ".join(f"{key}={value}" for key, value in sorted(payload["counts"].items()))
    print(f"Saved Gary review console: {output_path} ({counts or 'empty queue'})")
    print(f"Run: {payload['run'].get('id')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
