from dataclasses import dataclass
from pathlib import Path

from .crawler import crawl_calls
from .fetcher import HttpFetcher
from .output import write_result
from .renderer import PlaywrightFetcher
from .source_schema import PwOrgSchema
from .nyfa_source import NYFA_ARCHIVE_URL, crawl_nyfa_visual_arts


@dataclass(frozen=True, slots=True)
class CrawlConfig:
    index_url: str = "https://www.pw.org/grants"
    limit: int | None = 25
    timeout: float = 30.0
    max_bytes: int = 5_000_000
    max_site_pages: int = 5
    max_call_images: int = 1
    max_asset_bytes: int = 5_000_000
    render: bool = False
    follow_official_sites: bool = True
    max_index_pages: int = 1
    calendar_start_month: str | None = None
    calendar_end_month: str | None = None
    calendar_url_template: str = "https://www.pw.org/submission_calendar/{month}"
    adapter: str = "poets-writers"


def crawl_to_manifest(config: CrawlConfig, output_dir: Path) -> Path:
    if config.limit is not None and config.limit < 1:
        raise ValueError("limit must be at least 1")
    if (config.calendar_start_month is None) != (config.calendar_end_month is None):
        raise ValueError("calendar_start_month and calendar_end_month must be provided together")
    fetcher = HttpFetcher(timeout=config.timeout, max_bytes=config.max_bytes)
    renderer = None
    if config.render:
        renderer = PlaywrightFetcher(timeout=config.timeout, max_bytes=config.max_bytes)
    try:
        calendar_urls = []
        if config.calendar_start_month and config.calendar_end_month:
            calendar_urls = PwOrgSchema(
                grants_index_url=config.index_url,
                grants_max_pages=config.max_index_pages,
                calendar_url_template=config.calendar_url_template,
            ).calendar_urls(config.calendar_start_month, config.calendar_end_month)
        if config.adapter == "nyfa-visual-arts":
            archive = fetcher.fetch(config.index_url)
            if archive.status_code in {403, 429} and renderer is not None:
                archive = renderer.fetch(config.index_url)
            result = crawl_nyfa_visual_arts(
                archive,
                _FallbackFetcher(fetcher, renderer),
                limit=config.limit,
            )
        else:
            result = crawl_calls(
                config.index_url,
                limit=config.limit,
                fetcher=fetcher,
                follow_official_sites=config.follow_official_sites,
                renderer=renderer,
                max_site_pages=config.max_site_pages,
                max_index_pages=config.max_index_pages,
                calendar_urls=calendar_urls,
            )
        failed_index_pages = [page for page in result.index_pages if page.error]
        if failed_index_pages:
            raise RuntimeError(
                f"Could not fetch source page {failed_index_pages[0].requested_url}: "
                f"{failed_index_pages[0].error}"
            )
        return write_result(
            result,
            output_dir,
            asset_fetcher=fetcher,
            max_call_images=config.max_call_images,
            max_asset_bytes=config.max_asset_bytes,
        )
    finally:
        fetcher.close()
        if renderer is not None:
            renderer.close()


class _FallbackFetcher:
    def __init__(self, http_fetcher, renderer):
        self.http_fetcher = http_fetcher
        self.renderer = renderer

    def fetch(self, url: str):
        page = self.http_fetcher.fetch(url)
        if page.status_code in {403, 429} and self.renderer is not None:
            return self.renderer.fetch(url)
        return page
