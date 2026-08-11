from __future__ import annotations

import hashlib
import json
import mimetypes
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from pw_grants_crawler.models import PageSnapshot
from pw_grants_crawler.profile_crawler import CrawledProfile, ProfileCrawlResult
from pw_grants_crawler.profile_output import write_profile_result
from pw_grants_crawler.profile_parser import parse_profile_detail, parse_profile_index
from pw_grants_crawler.profile_source import PwProfileSchema


def snapshot(url: str, html: str) -> PageSnapshot:
    soup = BeautifulSoup(html, "html.parser")
    return PageSnapshot(url, url, 200, "text/html", html, soup.title.get_text(" ", strip=True) if soup.title else "", soup.get_text(" ", strip=True))


def main() -> None:
    root = Path("outputs/gary-small-press-media-live/pw-org-small_presses")
    index_paths = sorted((root / "index-pages").glob("*.html"), key=lambda p: int(re.search(r"(\d+)", p.name).group(1)))
    index_pages = []
    summaries = []
    seen = set()
    for path in index_paths:
        url = "https://www.pw.org/small_presses" if path.stem == "01" else f"https://www.pw.org/small_presses?page={int(path.stem)-1}"
        page = snapshot(url, path.read_text(encoding="utf-8"))
        index_pages.append(page)
        for summary in parse_profile_index(page.html, page.final_url, profile_kind="small_press"):
            if summary.detail_url not in seen:
                seen.add(summary.detail_url)
                summaries.append(summary)
    profiles = []
    for rank, summary in enumerate(summaries, 1):
        slug = f"{rank:03d}-{re.sub(r'[^a-z0-9]+', '-', summary.name.lower()).strip('-')}"
        path = root / "profiles" / f"{slug}.html"
        html = path.read_text(encoding="utf-8") if path.exists() else ""
        page = snapshot(summary.detail_url, html)
        detail = parse_profile_detail(html, page.final_url, profile_kind="small_press") if html else None
        profiles.append(CrawledProfile(summary, detail, page if html else None))
    result = ProfileCrawlResult(index_pages, profiles, profile_kind="small_press")
    manifest = write_profile_result(result, root)
    payload = json.loads(manifest.read_text(encoding="utf-8"))
    assets_root = root / "assets" / "profiles"
    assets = 0
    for profile in payload["profiles"]:
        slug = f"{profile['rank']:03d}-{re.sub(r'[^a-z0-9]+', '-', profile['name'].lower()).strip('-')}"
        files = list((assets_root / slug).glob("*"))
        if not files:
            continue
        file = files[0]
        data = file.read_bytes()
        suffix = file.suffix.lower()
        content_type = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        detail_page = profile.get("source", {}).get("detail_page")
        detail_url = (profile.get("detail") or {}).get("image_url") or ""
        asset = {"source_page_url": profile["source"]["detail_url"], "original_url": detail_url, "final_url": detail_url, "kind": "image", "content_type": content_type, "status_code": 200, "byte_size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "local_path": str(file.relative_to(root)), "alt_text": profile["name"], "relation": "profile.image", "error": None, "source_page_path": detail_page["html_path"] if detail_page else None}
        profile["media_assets"] = [asset]
        if detail_page is not None:
            detail_page["media_assets"] = [asset]
        assets += 1
    payload["generated_at"] = datetime.now(timezone.utc).isoformat()
    manifest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"recovered manifest={manifest} profiles={len(payload['profiles'])} assets={assets}")


if __name__ == "__main__":
    main()
