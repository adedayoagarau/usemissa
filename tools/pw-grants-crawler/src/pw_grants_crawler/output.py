import json
import re
from datetime import datetime, timezone
from pathlib import Path

from .media import AssetFetcher, MediaCollector
from .models import CrawlResult, CrawledCall, HostEvidence, PageSnapshot


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return slug or "untitled"


def _asset_dict(asset, source_page_path: str | None = None) -> dict[str, object]:
    payload = {
        "source_page_url": asset.source_page_url,
        "original_url": asset.original_url,
        "final_url": asset.final_url,
        "kind": asset.kind,
        "content_type": asset.content_type,
        "status_code": asset.status_code,
        "byte_size": asset.byte_size,
        "sha256": asset.sha256,
        "local_path": asset.local_path,
        "alt_text": asset.alt_text,
        "relation": asset.relation,
        "error": asset.error,
    }
    if source_page_path is not None:
        payload["source_page_path"] = source_page_path
    return payload


def _snapshot_dict(snapshot: PageSnapshot, html_path: str, media_assets: list = None) -> dict[str, object]:
    media_assets = media_assets or []
    return {
        "requested_url": snapshot.requested_url,
        "final_url": snapshot.final_url,
        "status_code": snapshot.status_code,
        "content_type": snapshot.content_type,
        "title": snapshot.title,
        "text": snapshot.text,
        "error": snapshot.error,
        "rendered": snapshot.rendered,
        "resource_urls": snapshot.resource_urls,
        "media_assets": [_asset_dict(asset, html_path) for asset in media_assets],
        "html_path": html_path,
    }


def _evidence_dict(
    evidence: HostEvidence,
    page_paths: list[tuple[PageSnapshot, str]],
    page_assets: dict[int, list] | None = None,
) -> dict[str, object]:
    path_by_page = {id(page): path for page, path in page_paths}
    page_assets = page_assets or {}

    def path_for(page: PageSnapshot | None) -> str | None:
        if page is None:
            return None
        if id(page) in path_by_page:
            return path_by_page[id(page)]
        for candidate, path in page_paths:
            if candidate == page:
                return path
        return None

    return {
        "status": evidence.status,
        "match_score": evidence.match_score,
        "discovered_urls": evidence.discovered_urls,
        "fields": evidence.fields,
        "missing_fields": evidence.missing_fields,
        "field_candidates": evidence.field_candidates,
        "field_conflicts": evidence.field_conflicts,
        "canonical_source": evidence.canonical_source,
        "canonical_fields": evidence.canonical_fields,
        "canonical_reason": evidence.canonical_reason,
        "notes": evidence.notes,
        "selected_page": (
            _snapshot_dict(
                evidence.selected_page,
                path_for(evidence.selected_page),
                page_assets.get(id(evidence.selected_page), []),
            )
            if evidence.selected_page is not None and path_for(evidence.selected_page) is not None
            else None
        ),
        "pages": [
            _snapshot_dict(page, path_by_page[id(page)], page_assets.get(id(page), []))
            for page, _ in page_paths
            if id(page) in path_by_page
        ],
    }


def _call_payload(
    crawled: CrawledCall,
    rank: int,
    detail_path: str,
    official_path: str | None,
    official_paths: list[tuple[PageSnapshot, str]],
    page_assets: dict[int, list] | None = None,
) -> dict[str, object]:
    detail = crawled.detail
    page_assets = page_assets or {}
    call_pages = [crawled.detail_page] + [page for page, _ in official_paths]
    media_assets = [
        _asset_dict(asset, path)
        for page in call_pages
        for asset in page_assets.get(id(page), [])
        for path in [
            detail_path
            if page is crawled.detail_page
            else next((candidate_path for candidate, candidate_path in official_paths if candidate is page), None)
        ]
        if path is not None
    ]
    return {
        "rank": rank,
        "organizer": detail.organizer,
        "title": detail.title,
        "deadline": detail.deadline.isoformat() if detail.deadline else None,
        "deadline_note": detail.deadline_note,
        "entry_fee": detail.entry_fee,
        "cash_prize": detail.cash_prize,
        "genres": crawled.summary.genres,
        "contact_email": detail.contact_email,
        "official_website": detail.official_website,
        "description": detail.description,
        "contact_details": detail.contact_details,
        "tags": detail.tags,
        "full_text": detail.full_text,
        "source": {
            "index_url": crawled.summary.index_url,
            "detail_url": detail.detail_url,
            "detail_page": _snapshot_dict(
                crawled.detail_page,
                detail_path,
                page_assets.get(id(crawled.detail_page), []),
            ),
            "official_site_page": (
                _snapshot_dict(
                    crawled.official_site_page,
                    official_path,
                    page_assets.get(id(crawled.official_site_page), []),
                )
                if crawled.official_site_page and official_path
                else None
            ),
        },
        "official_evidence": (
            _evidence_dict(crawled.official_evidence, official_paths, page_assets)
            if crawled.official_evidence is not None
            else None
        ),
        "media_assets": media_assets,
    }


def write_result(
    result: CrawlResult,
    output_dir: Path,
    *,
    asset_fetcher: AssetFetcher | None = None,
    max_call_images: int = 1,
    max_asset_bytes: int = 5_000_000,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    pages_dir = output_dir / "pages"
    official_sites_dir = output_dir / "official-sites"
    index_pages_dir = output_dir / "index-pages"
    pages_dir.mkdir(exist_ok=True)
    official_sites_dir.mkdir(exist_ok=True)
    index_pages_dir.mkdir(exist_ok=True)
    collector = (
        MediaCollector(
            asset_fetcher,
            max_asset_bytes=max_asset_bytes,
        )
        if asset_fetcher is not None
        else None
    )
    page_assets: dict[int, list] = {}

    index_pages = result.index_pages or [result.index_page]
    (output_dir / "index.html").write_text(index_pages[0].html, encoding="utf-8")
    index_page_payloads = []
    for page_index, page in enumerate(index_pages, start=1):
        html_path = f"index-pages/{page_index:02d}.html"
        (output_dir / html_path).write_text(page.html, encoding="utf-8")
        index_page_payloads.append(_snapshot_dict(page, html_path))
    calls: list[dict[str, object]] = []
    for rank, crawled in enumerate(result.calls, start=1):
        slug = f"{rank:02d}-{slugify(crawled.detail.organizer)}-{slugify(crawled.detail.title)}"
        detail_path = f"pages/{slug}.html"
        (output_dir / detail_path).write_text(crawled.detail_page.html, encoding="utf-8")

        official_path = None
        official_paths: list[tuple[PageSnapshot, str]] = []
        if crawled.official_evidence is not None:
            for page_index, page in enumerate(crawled.official_evidence.pages, start=1):
                is_selected = (
                    page is crawled.official_evidence.selected_page
                    or (
                        official_path is None
                        and page == crawled.official_evidence.selected_page
                    )
                )
                current_path = (
                    f"official-sites/{slug}.html"
                    if is_selected
                    else f"official-sites/{slug}-page-{page_index}.html"
                )
                (output_dir / current_path).write_text(page.html, encoding="utf-8")
                official_paths.append((page, current_path))
                if is_selected:
                    official_path = current_path
        elif crawled.official_site_page is not None:
            official_path = f"official-sites/{slug}.html"
            (output_dir / official_path).write_text(
                crawled.official_site_page.html,
                encoding="utf-8",
            )
            official_paths.append((crawled.official_site_page, official_path))
        if collector is not None:
            selected_page = (
                crawled.official_evidence.selected_page
                if crawled.official_evidence is not None
                else crawled.official_site_page
            )
            official_pages = sorted(
                official_paths,
                key=lambda item: 0 if item[0] is selected_page or item[0] == selected_page else 1,
            )
            call_pages = [page for page, _ in official_pages] + [crawled.detail_page]
            for page, asset in collector.collect_call_images(
                call_pages,
                output_dir / "assets",
                scope=slug,
                preferred_terms=[crawled.detail.title, crawled.detail.organizer],
                max_images=max_call_images,
            ):
                page_assets.setdefault(id(page), []).append(asset)
        calls.append(_call_payload(crawled, rank, detail_path, official_path, official_paths, page_assets))

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "index": _snapshot_dict(index_pages[0], "index.html", page_assets.get(id(index_pages[0]), [])),
        "index_pages": index_page_payloads,
        "calls": calls,
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest_path
