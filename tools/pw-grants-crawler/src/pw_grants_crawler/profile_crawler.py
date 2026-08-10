from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Callable, Protocol

from .identity import normalize_url
from .models import PageSnapshot
from .profile_models import ProfileDetail, ProfileKind, ProfileSummary
from .profile_parser import parse_profile_detail, parse_profile_index
from .profile_source import PwProfileSchema, next_profile_page_url


class ProfileFetcher(Protocol):
    def fetch(self, url: str) -> PageSnapshot: ...


@dataclass(frozen=True, slots=True)
class CrawledProfile:
    summary: ProfileSummary
    detail: ProfileDetail | None
    detail_page: PageSnapshot | None


@dataclass(frozen=True, slots=True)
class ProfileCrawlResult:
    index_pages: list[PageSnapshot]
    profiles: list[CrawledProfile]
    errors: list[str] = field(default_factory=list)
    profile_kind: ProfileKind | None = None
    rank_offset: int = 0


def crawl_profiles(
    schema: PwProfileSchema,
    fetcher: ProfileFetcher,
    *,
    limit: int | None = None,
    max_index_pages: int | None = None,
    fetch_details: bool = True,
    detail_concurrency: int = 1,
    detail_fetcher_factory: Callable[[], ProfileFetcher] | None = None,
) -> ProfileCrawlResult:
    """Discover one PW profile directory in memory.

    This function deliberately has no storage side effects. A caller must
    make an explicit data-use decision before writing the returned source
    content to disk or a database.
    """

    if limit is not None and limit < 1:
        raise ValueError("limit must be at least 1 when provided")
    page_limit = max_index_pages or schema.max_pages
    if page_limit < 1:
        raise ValueError("max_index_pages must be at least 1 when provided")
    if detail_concurrency < 1:
        raise ValueError("detail_concurrency must be at least 1")
    if fetch_details and detail_concurrency > 1 and detail_fetcher_factory is None:
        raise ValueError("detail_fetcher_factory is required when detail_concurrency is greater than 1")

    index_pages: list[PageSnapshot] = []
    summaries: list[ProfileSummary] = []
    seen_index_urls: set[str] = set()
    seen_profile_urls: set[str] = set()
    errors: list[str] = []
    current_url = schema.index_url(schema.start_page)

    while current_url and len(index_pages) < page_limit:
        normalized_index_url = normalize_url(current_url)
        if normalized_index_url in seen_index_urls:
            break
        seen_index_urls.add(normalized_index_url)
        page = fetcher.fetch(current_url)
        index_pages.append(page)
        if page.error:
            errors.append(f"{current_url}: {page.error}")
            break
        page_summaries = parse_profile_index(page.html, page.final_url, profile_kind=schema.kind)
        for summary in page_summaries:
            key = normalize_url(summary.detail_url)
            if key in seen_profile_urls:
                continue
            seen_profile_urls.add(key)
            summaries.append(summary)
            if limit is not None and len(summaries) >= limit:
                break
        if limit is not None and len(summaries) >= limit:
            break
        current_url = next_profile_page_url(page.html, page.final_url)

    profiles: list[CrawledProfile] = []
    if not fetch_details:
        profiles = [CrawledProfile(summary, None, None) for summary in summaries]
    else:
        def fetch_detail(summary: ProfileSummary, detail_fetcher: ProfileFetcher):
            detail_page = detail_fetcher.fetch(summary.detail_url)
            if detail_page.error:
                return CrawledProfile(summary, None, detail_page), f"{summary.detail_url}: {detail_page.error}"
            detail = parse_profile_detail(
                detail_page.html,
                detail_page.final_url,
                profile_kind=schema.kind,
            )
            return CrawledProfile(summary, detail, detail_page), None

        if detail_concurrency == 1:
            fetched = [fetch_detail(summary, fetcher) for summary in summaries]
        else:
            detail_fetchers = [detail_fetcher_factory() for _ in range(detail_concurrency)]
            try:
                with ThreadPoolExecutor(max_workers=detail_concurrency) as executor:
                    futures = [
                        executor.submit(
                            fetch_detail,
                            summary,
                            detail_fetchers[index % detail_concurrency],
                        )
                        for index, summary in enumerate(summaries)
                    ]
                    fetched = [future.result() for future in futures]
            finally:
                for detail_fetcher in detail_fetchers:
                    close = getattr(detail_fetcher, "close", None)
                    if close is not None:
                        close()
        for profile, error in fetched:
            profiles.append(profile)
            if error:
                errors.append(error)

    return ProfileCrawlResult(
        index_pages=index_pages,
        profiles=profiles,
        errors=errors,
        profile_kind=schema.kind,
        rank_offset=schema.start_page * schema.page_size,
    )
