from __future__ import annotations

import hashlib
import json
import mimetypes
import re
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from .media import AssetFetcher
from .models import MediaAsset, PageSnapshot
from .profile_crawler import CrawledProfile, ProfileCrawlResult
from .profile_models import ProfileDetail
from .output import slugify


def _asset_dict(asset: MediaAsset, source_page_path: str | None = None) -> dict[str, object]:
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


def _snapshot_dict(
    snapshot: PageSnapshot,
    html_path: str,
    media_assets: list[MediaAsset] | None = None,
) -> dict[str, object]:
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
        "media_assets": [
            _asset_dict(asset, html_path) for asset in (media_assets or [])
        ],
        "html_path": html_path,
    }


def _detail_payload(detail: ProfileDetail | None) -> dict[str, object] | None:
    if detail is None:
        return None
    return asdict(detail)


def _image_extension(url: str, content_type: str | None) -> str:
    suffix = Path(urlparse(url).path).suffix.casefold()
    if suffix and len(suffix) <= 8:
        return suffix
    return mimetypes.guess_extension((content_type or "").split(";", 1)[0]) or ".bin"


def _download_profile_image(
    detail: ProfileDetail,
    detail_page: PageSnapshot,
    asset_fetcher: AssetFetcher,
    output_dir: Path,
    scope: str,
    max_asset_bytes: int,
) -> MediaAsset | None:
    if not detail.image_url:
        return None
    snapshot = asset_fetcher.fetch_binary(detail.image_url, max_bytes=max_asset_bytes)
    content = snapshot.content
    sha256 = hashlib.sha256(content).hexdigest() if content else None
    local_path = None
    if content and snapshot.error is None and sha256:
        relative_path = Path("assets") / "profiles" / scope / f"{sha256[:16]}{_image_extension(snapshot.final_url, snapshot.content_type)}"
        destination = output_dir / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            destination.write_bytes(content)
        local_path = str(relative_path)
    return MediaAsset(
        source_page_url=detail_page.final_url,
        original_url=detail.image_url,
        final_url=snapshot.final_url,
        kind="image",
        content_type=snapshot.content_type,
        status_code=snapshot.status_code,
        byte_size=len(content) if content else None,
        sha256=sha256,
        local_path=local_path,
        relation="profile.image",
        error=snapshot.error,
    )


def write_profile_result(
    result: ProfileCrawlResult,
    output_dir: Path,
    *,
    asset_fetcher: AssetFetcher | None = None,
    max_profile_images: int = 1,
    max_asset_bytes: int = 5_000_000,
) -> Path:
    """Write a profile crawl manifest and raw source snapshots."""

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "index-pages").mkdir(exist_ok=True)
    (output_dir / "profiles").mkdir(exist_ok=True)

    index_pages = result.index_pages
    index_payloads: list[dict[str, object]] = []
    for page_index, page in enumerate(index_pages, start=1):
        html_path = f"index-pages/{page_index:02d}.html"
        (output_dir / html_path).write_text(page.html, encoding="utf-8")
        index_payloads.append(_snapshot_dict(page, html_path))

    profiles: list[dict[str, object]] = []
    for rank, crawled in enumerate(result.profiles, start=1 + result.rank_offset):
        summary = crawled.summary
        slug = f"{rank:03d}-{slugify(summary.name)}"
        detail_path = f"profiles/{slug}.html"
        if crawled.detail_page is not None:
            (output_dir / detail_path).write_text(
                crawled.detail_page.html,
                encoding="utf-8",
            )
        media_assets: list[MediaAsset] = []
        if (
            asset_fetcher is not None
            and max_profile_images > 0
            and crawled.detail is not None
            and crawled.detail_page is not None
        ):
            asset = _download_profile_image(
                crawled.detail,
                crawled.detail_page,
                asset_fetcher,
                output_dir,
                slug,
                max_asset_bytes,
            )
            if asset is not None:
                media_assets.append(asset)
        detail_page = (
            _snapshot_dict(crawled.detail_page, detail_path, media_assets)
            if crawled.detail_page is not None
            else None
        )
        profiles.append(
            {
                "rank": rank,
                "kind": summary.kind,
                "name": summary.name,
                "summary": summary.summary,
                "reading_period": summary.reading_period,
                "genres": summary.genres,
                "subgenres": summary.subgenres,
                "detail": _detail_payload(crawled.detail),
                "source": {
                    "index_url": summary.index_url,
                    "detail_url": summary.detail_url,
                    "detail_page": detail_page,
                },
                "media_assets": [
                    _asset_dict(asset, detail_path) for asset in media_assets
                ],
            }
        )

    first_index = index_payloads[0] if index_payloads else None
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "profile_kind": result.profile_kind
        or (result.profiles[0].summary.kind if result.profiles else None),
        "index": first_index,
        "index_pages": index_payloads,
        "profiles": profiles,
        "errors": result.errors,
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return manifest_path
