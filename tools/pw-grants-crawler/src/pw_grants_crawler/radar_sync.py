from __future__ import annotations

import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .neon import NeonStore

RADAR_ADAPTERS = (
    "african-culture-fund-index",
    "commonwealth-detail",
    "eu-funding-api",
    "film-independent-detail",
    "grants-gov-api",
    "ida-grants-directory",
    "music-in-africa-detail",
    "newpages-detail",
    "on-the-move-detail",
    "resartis-detail",
    "sundance-deadlines",
    "transartists-detail",
)


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _call(source: dict[str, Any], opportunity: dict[str, Any], snapshot: dict[str, Any] | None, rank: int) -> dict[str, Any]:
    fields = opportunity.get("fields") or {}
    deadline = (fields.get("deadline") or {}).get("date")
    title = _text(fields.get("title") or source.get("name") or opportunity.get("id"))[:500]
    url = _text(opportunity.get("sourceUrl") or fields.get("guidelinesUrl") or source.get("url"))
    content = _text((snapshot or {}).get("content"))
    description = _text(fields.get("description"))
    if not description:
        description = content[:4_000]
    page_text = content or json.dumps({"status": opportunity.get("status"), "fields": fields}, ensure_ascii=False)
    html = f"<html><body><main><h1>{title}</h1><p>{description}</p></main></body></html>"
    path = f"pages/{rank:05d}-{opportunity.get('id', 'opportunity')}.html"
    return {
        "rank": rank,
        "organizer": _text(source.get("registryOrganizationName") or source.get("name") or "Unknown source"),
        "title": title,
        "deadline": deadline,
        "deadline_note": None,
        "entry_fee": None,
        "cash_prize": None,
        "genres": fields.get("genres") or [],
        "contact_email": None,
        "official_website": url,
        "description": description,
        "contact_details": None,
        "tags": [],
        "full_text": page_text,
        "source": {
            "index_url": source.get("url"),
            "detail_url": url,
            "detail_page": {
                "requested_url": url,
                "final_url": url,
                "status_code": 200,
                "content_type": "text/html",
                "title": title,
                "text": page_text,
                "error": None,
                "rendered": False,
                "resource_urls": [],
                "media_assets": [],
                "html_path": path,
            },
            "official_site_page": None,
        },
        "official_evidence": {
            "status": "verified",
            "match_score": 1.0,
            "discovered_urls": [],
            "fields": {"deadline": deadline, "description": description},
            "missing_fields": [],
            "field_candidates": {},
            "field_conflicts": [],
            "canonical_source": "host",
            "canonical_fields": {"deadline": deadline, "description": description},
            "canonical_reason": "Imported from Radar's canonical source observation.",
            "notes": ["Gary bridge import; Radar retained the source fetch and freshness evidence."],
            "selected_page": None,
            "pages": [],
        },
        "media_assets": [],
    }


def sync_radar_adapter(store: NeonStore, adapter: str, *, freshness_hours: int = 1) -> str | None:
    """Import current Radar opportunities into Gary without inventing source facts."""
    source_key = f"radar.{adapter}"
    source_name = f"Radar canonical sync: {adapter}"
    store.register_source(
        source_id=source_key,
        adapter=f"radar-sync:{adapter}",
        name=source_name,
        seed_url=f"radar://{adapter}",
        freshness_hours=freshness_hours,
        config={"worker": "gary", "upstream": "radar", "adapter": adapter},
    )
    with store.connect_factory(store.database_url) as connection:
        due = connection.execute(
            "SELECT next_refresh_at FROM gary_sources WHERE id = %s",
            (source_key,),
        ).fetchone()
    if due and due[0] is not None and due[0] > datetime.now(timezone.utc):
        return None
    rows: list[tuple[Any, ...]] = []
    with store.connect_factory(store.database_url) as connection:
        rows = connection.execute(
            """
            SELECT sources.data, opportunities.data, snapshots.data
            FROM radar_sources AS sources
            JOIN radar_opportunities AS opportunities
              ON opportunities.data->>'sourceId' = sources.id
            LEFT JOIN LATERAL (
              SELECT data FROM radar_snapshots
              WHERE data->>'sourceId' = sources.id
                 OR data->>'url' = opportunities.data->>'sourceUrl'
              ORDER BY data->>'fetchedAt' DESC NULLS LAST
              LIMIT 1
            ) AS snapshots ON TRUE
            WHERE sources.data->>'discoveryAdapterId' = %s
              AND opportunities.status NOT IN ('discovered', 'needs-verification')
            ORDER BY opportunities.data->>'sourceUrl', opportunities.id
            """,
            (adapter,),
        ).fetchall()
    if not rows:
        return None
    with tempfile.TemporaryDirectory(prefix="gary-radar-sync-") as directory:
        root = Path(directory)
        calls = []
        for rank, (source_data, opportunity_data, snapshot_data) in enumerate(rows, start=1):
            calls.append(_call(source_data, opportunity_data, snapshot_data, rank))
        manifest = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "index": {
                "requested_url": f"radar://{adapter}", "final_url": f"radar://{adapter}",
                "status_code": 200, "content_type": "application/json", "title": source_name,
                "text": f"Radar canonical sync for {adapter}", "error": None, "rendered": False,
                "resource_urls": [], "media_assets": [], "html_path": "index.html",
            },
            "index_pages": [],
            "calls": calls,
        }
        manifest_path = root / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
        run_id = store.ingest_manifest(
            manifest_path,
            source_id=source_key,
            mode="backfill",
            source_name=source_name,
            adapter=f"radar-sync:{adapter}",
            freshness_hours=freshness_hours,
        )
        return run_id
