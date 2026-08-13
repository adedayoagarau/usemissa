from __future__ import annotations

import re
from datetime import date, datetime
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .models import CallDetail, CallSummary, CrawledCall, CrawlResult, PageSnapshot

NYFA_ARCHIVE_URL = "https://www.nyfa.org/grant-discipline/visual-arts/"
NYFA_HOST = "www.nyfa.org"


def nyfa_call_urls(html: str, base_url: str = NYFA_ARCHIVE_URL) -> list[str]:
    """Extract only NYFA's canonical award/grant detail pages."""
    soup = BeautifulSoup(html, "html.parser")
    found: list[str] = []
    seen: set[str] = set()
    for anchor in soup.select("a[href]"):
        href = urljoin(base_url, anchor.get("href", "")).split("#", 1)[0].rstrip("/")
        if not href.startswith(f"https://{NYFA_HOST}/awards-grants/"):
            continue
        if href in seen:
            continue
        seen.add(href)
        found.append(href)
    return found


def _text(node) -> str:
    return node.get_text(" ", strip=True) if node is not None else ""


def _date_from_text(value: str) -> date | None:
    match = re.search(r"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})", value)
    if not match:
        match = re.search(r"([A-Z][a-z]+\s+\d{1,2},\s+\d{4})", value)
    if not match:
        return None
    try:
        return datetime.strptime(match.group(1), "%B %d, %Y").date()
    except ValueError:
        return None


def parse_nyfa_detail(html: str, detail_url: str) -> CallDetail:
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.select_one("h1") or soup.select_one("main h2") or soup.title
    title = _text(heading).replace(" - NYFA", "").strip()
    main = soup.select_one("main") or soup.body or soup
    text = _text(main)
    deadline = _date_from_text(text)
    description = ""
    for paragraph in main.select("p"):
        candidate = _text(paragraph)
        if len(candidate) >= 40 and "Applications" not in candidate[:30]:
            description = candidate
            break
    return CallDetail(
        organizer="New York Foundation for the Arts",
        title=title,
        detail_url=detail_url,
        deadline=deadline,
        deadline_note=None,
        entry_fee=None,
        cash_prize=None,
        contact_email=None,
        official_website=detail_url,
        description=description,
        contact_details=None,
        tags=[_text(a) for a in soup.select("a[href]") if _text(a) in {"Visual Arts", "Grant", "Award"}],
        full_text=text,
    )


def crawl_nyfa_visual_arts(
    archive_page: PageSnapshot,
    detail_fetcher,
    *,
    limit: int | None = None,
) -> CrawlResult:
    urls = nyfa_call_urls(archive_page.html, archive_page.final_url or NYFA_ARCHIVE_URL)
    if limit is not None:
        urls = urls[:limit]
    calls: list[CrawledCall] = []
    for url in urls:
        page = detail_fetcher.fetch(url)
        detail = parse_nyfa_detail(page.html, page.final_url or url)
        summary = CallSummary(
            organizer=detail.organizer,
            title=detail.title,
            detail_url=detail.detail_url,
            deadline=detail.deadline,
            entry_fee=None,
            cash_prize=None,
            genres=["Visual Arts"],
            summary=detail.description,
            index_url=archive_page.final_url or NYFA_ARCHIVE_URL,
        )
        calls.append(CrawledCall(summary=summary, detail=detail, detail_page=page, official_site_page=None))
    return CrawlResult(index_page=archive_page, calls=calls, index_pages=[archive_page])
