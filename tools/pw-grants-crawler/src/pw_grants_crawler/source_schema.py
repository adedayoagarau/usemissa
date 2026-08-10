from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from urllib.parse import parse_qs, urljoin, urlsplit

from bs4 import BeautifulSoup


@dataclass(frozen=True, slots=True)
class PwOrgSchema:
    """Navigation contract for the P&W grants index and submission calendar."""

    grants_index_url: str = "https://www.pw.org/grants"
    grants_max_pages: int = 50
    calendar_url_template: str = "https://www.pw.org/submission_calendar/{month}"

    def calendar_url(self, month: str) -> str:
        return self.calendar_url_template.format(month=month)

    def calendar_urls(self, start_month: str, end_month: str) -> list[str]:
        return calendar_month_urls(start_month, end_month, self.calendar_url_template)


def _page_number(url: str) -> int:
    values = parse_qs(urlsplit(url).query).get("page", ["0"])
    try:
        return int(values[0])
    except (TypeError, ValueError):
        return 0


def next_grants_page_url(html: str, current_url: str) -> str | None:
    """Return the lowest linked P&W grants page after ``current_url``."""

    current = urlsplit(current_url)
    current_page = _page_number(current_url)
    candidates: list[tuple[int, str]] = []
    soup = BeautifulSoup(html, "html.parser")
    for link in soup.select("a[href]"):
        absolute = urljoin(current_url, link["href"])
        parsed = urlsplit(absolute)
        if (parsed.scheme, parsed.netloc, parsed.path) != (current.scheme, current.netloc, current.path):
            continue
        query = parse_qs(parsed.query)
        if set(query) != {"page"}:
            continue
        page = _page_number(absolute)
        if page > current_page:
            candidates.append((page, absolute))
    return min(candidates)[1] if candidates else None


def calendar_month_urls(start_month: str, end_month: str, url_template: str) -> list[str]:
    """Return inclusive ``YYYY-MM`` calendar URLs in chronological order."""

    start = date.fromisoformat(f"{start_month}-01")
    end = date.fromisoformat(f"{end_month}-01")
    if start > end:
        raise ValueError("start_month must be before or equal to end_month")
    urls: list[str] = []
    current = start
    while current <= end:
        urls.append(url_template.format(month=current.strftime("%Y-%m")))
        current = _next_month(current)
    return urls


def calendar_month_range(start_month: str, count: int) -> tuple[str, str]:
    if count < 1:
        raise ValueError("count must be at least 1")
    start = date.fromisoformat(f"{start_month}-01")
    end = start
    for _ in range(count - 1):
        end = _next_month(end)
    return start.strftime("%Y-%m"), end.strftime("%Y-%m")


def _next_month(current: date) -> date:
    return date(
        current.year + (1 if current.month == 12 else 0),
        1 if current.month == 12 else current.month + 1,
        1,
    )
