from dataclasses import replace
from typing import Protocol

from .evidence import build_host_evidence
from .identity import normalize_url
from .models import CrawlResult, CrawledCall, PageSnapshot
from .parser import parse_calendar, parse_detail, parse_index
from .sorting import sort_calls
from .source_schema import next_grants_page_url


class PageFetcher(Protocol):
    def fetch(self, url: str) -> PageSnapshot:
        ...


def crawl_calls(
    index_url: str,
    *,
    limit: int | None,
    fetcher: PageFetcher,
    follow_official_sites: bool = True,
    renderer: PageFetcher | None = None,
    max_site_pages: int = 5,
    max_index_pages: int = 1,
    calendar_urls: list[str] | None = None,
) -> CrawlResult:
    if limit is not None and limit < 1:
        raise ValueError("limit must be at least 1 when provided")
    if max_index_pages < 1:
        raise ValueError("max_index_pages must be at least 1")

    index_pages: list[PageSnapshot] = []
    visited_index_urls: set[str] = set()
    current_url: str | None = index_url
    summaries_by_url = {}
    while current_url and len(index_pages) < max_index_pages:
        normalized_index_url = normalize_url(current_url)
        if normalized_index_url in visited_index_urls:
            break
        visited_index_urls.add(normalized_index_url)
        page = fetcher.fetch(current_url)
        index_pages.append(page)
        for summary in parse_index(page.html, page.final_url):
            key = normalize_url(summary.detail_url)
            existing = summaries_by_url.get(key)
            if existing is None:
                summaries_by_url[key] = summary
            else:
                summaries_by_url[key] = _merge_summary(existing, summary)
        current_url = next_grants_page_url(page.html, page.final_url)

    for calendar_url in calendar_urls or []:
        if normalize_url(calendar_url) in visited_index_urls:
            continue
        page = fetcher.fetch(calendar_url)
        index_pages.append(page)
        visited_index_urls.add(normalize_url(calendar_url))
        for summary in parse_calendar(page.html, page.final_url):
            key = normalize_url(summary.detail_url)
            existing = summaries_by_url.get(key)
            if existing is None:
                summaries_by_url[key] = summary
            else:
                summaries_by_url[key] = _merge_summary(existing, summary)

    index_page = index_pages[0]
    summaries = sort_calls(list(summaries_by_url.values()))
    if limit is not None:
        summaries = summaries[:limit]
    crawled_calls: list[CrawledCall] = []
    for summary in summaries:
        detail_page = fetcher.fetch(summary.detail_url)
        detail = parse_detail(detail_page.html, detail_page.final_url)
        official_site_page = None
        official_evidence = None
        if follow_official_sites and detail.official_website:
            initial_official_page = fetcher.fetch(detail.official_website)
            official_evidence = build_host_evidence(
                detail,
                initial_official_page,
                fetcher,
                renderer=renderer,
                max_pages=max_site_pages,
            )
            official_site_page = official_evidence.selected_page
        crawled_calls.append(
            CrawledCall(
                summary=summary,
                detail=detail,
                detail_page=detail_page,
                official_site_page=official_site_page,
                official_evidence=official_evidence,
            )
        )
    return CrawlResult(index_page=index_page, calls=crawled_calls, index_pages=index_pages)


def _merge_summary(primary, secondary):
    """Keep rich grants metadata while filling gaps from a calendar entry."""

    deadlines = [value for value in (primary.deadline, secondary.deadline) if value is not None]
    return replace(
        primary,
        deadline=min(deadlines) if deadlines else None,
        organizer=primary.organizer or secondary.organizer,
        title=primary.title or secondary.title,
        entry_fee=primary.entry_fee or secondary.entry_fee,
        cash_prize=primary.cash_prize or secondary.cash_prize,
        genres=primary.genres or secondary.genres,
        summary=primary.summary or secondary.summary,
    )
