from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup

from .profile_models import ProfileKind


def _page_number(url: str) -> int:
    values = parse_qs(urlsplit(url).query).get("page", ["0"])
    try:
        return int(values[0])
    except (TypeError, ValueError):
        return 0


def _with_page(url: str, page: int) -> str:
    parsed = urlsplit(url)
    query = parse_qs(parsed.query)
    if page == 0:
        query.pop("page", None)
    else:
        query["page"] = [str(page)]
    return urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urlencode(query, doseq=True), parsed.fragment)
    )


def next_profile_page_url(html: str, current_url: str) -> str | None:
    """Return the next unvisited PW profile index page, if present."""

    current_page = _page_number(current_url)
    current_path = urlsplit(current_url).path
    candidates: set[int] = set()
    soup = BeautifulSoup(html, "html.parser")
    for link in soup.select(".pager a[href]"):
        href = urljoin(current_url, link.get("href", ""))
        if urlsplit(href).path != current_path:
            continue
        page = _page_number(href)
        if page > current_page:
            candidates.add(page)
    if not candidates:
        return None
    return _with_page(current_url, min(candidates))


@dataclass(frozen=True, slots=True)
class PwProfileSchema:
    """Navigation contract for the two PW publisher-profile directories."""

    kind: ProfileKind
    base_host: str = "https://www.pw.org"
    max_pages: int = 100
    start_page: int = 0
    page_size: int = 25
    crawl_delay_seconds: float = 10.0

    def __post_init__(self) -> None:
        if self.kind not in {"literary_magazine", "small_press"}:
            raise ValueError(f"Unsupported profile kind: {self.kind}")
        if self.max_pages < 1:
            raise ValueError("max_pages must be at least 1")
        if self.start_page < 0:
            raise ValueError("start_page must be non-negative")
        if self.page_size < 1:
            raise ValueError("page_size must be at least 1")
        if self.crawl_delay_seconds < 0:
            raise ValueError("crawl_delay_seconds must be non-negative")

    @property
    def path(self) -> str:
        return "/literary_magazines" if self.kind == "literary_magazine" else "/small_presses"

    def index_url(self, page: int = 0) -> str:
        if page < 0:
            raise ValueError("page must be non-negative")
        return _with_page(urljoin(self.base_host, self.path), page)

    def detail_prefix(self) -> str:
        return urljoin(self.base_host, self.path + "/")
