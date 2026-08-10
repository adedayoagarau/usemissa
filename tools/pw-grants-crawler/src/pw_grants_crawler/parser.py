from datetime import date, datetime
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .models import CallDetail, CallSummary


def _text(node) -> str | None:
    if node is None:
        return None
    value = node.get_text(" ", strip=True)
    return value or None


def _parse_index_date(value: str | None) -> date | None:
    if not value:
        return None
    for format_string in ("%m/%d/%y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value.strip(), format_string).date()
        except ValueError:
            continue
    return None


def parse_index(html: str, index_url: str) -> list[CallSummary]:
    soup = BeautifulSoup(html, "html.parser")
    calls: list[CallSummary] = []
    for row in soup.select(".view-content > .views-row"):
        title_link = row.select_one(".views-field-title a[href]")
        if title_link is None:
            continue
        organizer = _text(row.select_one(".views-field-field-award-issuer .field-content")) or ""
        title = _text(title_link) or ""
        deadline_raw = _text(row.select_one(".views-field-field-deadline .field-content"))
        genres = [
            genre
            for link in row.select(".views-field-taxonomy-vocabulary-3 .field-content a")
            if (genre := _text(link))
        ]
        description = row.select_one(".views-field-body .views-field-field-description p")
        calls.append(
            CallSummary(
                organizer=organizer,
                title=title,
                detail_url=urljoin(index_url, title_link["href"]),
                deadline=_parse_index_date(deadline_raw),
                entry_fee=_text(row.select_one(".views-field-field-entry-amount-int .field-content")),
                cash_prize=_text(row.select_one(".views-field-field-cash-prize .field-content")),
                genres=genres,
                summary=_text(description) or "",
                index_url=index_url,
            )
        )
    return calls


def parse_calendar(html: str, calendar_url: str) -> list[CallSummary]:
    """Extract call links from a Poets & Writers month calendar page."""

    soup = BeautifulSoup(html, "html.parser")
    calls: list[CallSummary] = []
    seen: set[tuple[str, date | None]] = set()
    for cell in soup.select("td.single-day[data-date]"):
        try:
            deadline = date.fromisoformat(cell["data-date"])
        except (KeyError, TypeError, ValueError):
            deadline = None
        for item in cell.select(".calendar.monthview"):
            title_link = item.select_one(".views-field-title a[href]")
            if title_link is None:
                continue
            detail_url = urljoin(calendar_url, title_link["href"])
            key = (detail_url, deadline)
            if key in seen:
                continue
            seen.add(key)
            calls.append(
                CallSummary(
                    organizer=_text(item.select_one(".views-field-field-award-issuer .field-content")) or "",
                    title=_text(title_link) or "",
                    detail_url=detail_url,
                    deadline=deadline,
                    entry_fee=None,
                    cash_prize=None,
                    genres=[],
                    summary="",
                    index_url=calendar_url,
                )
            )
    return calls


def _parse_detail_date(node) -> date | None:
    if node is None:
        return None
    date_node = node.select_one("[content]")
    if date_node is not None:
        content = date_node.get("content", "")
        try:
            return datetime.fromisoformat(content.replace("Z", "+00:00")).date()
        except ValueError:
            pass
    value = _text(node.select_one(".field-item"))
    if not value:
        return None
    for format_string in ("%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(value.split(" - ", 1)[0].strip(), format_string).date()
        except ValueError:
            continue
    return None


def _field_text(root, field_name: str) -> str | None:
    return _text(root.select_one(f".field-name-{field_name} .field-item"))


def parse_detail(html: str, detail_url: str) -> CallDetail:
    soup = BeautifulSoup(html, "html.parser")
    article = soup.select_one("article.node-grant-award") or soup
    deadline_field = article.select_one(".field-name-field-deadline")
    website_link = article.select_one(".field-name-field-website a[href]")
    email_link = article.select_one(".field-name-field-contact-email a[href]")
    return CallDetail(
        organizer=_text(soup.select_one("#page-title")) or "",
        title=_text(soup.select_one(".grant-listing-title")) or "",
        detail_url=detail_url,
        deadline=_parse_detail_date(deadline_field),
        deadline_note=_text(deadline_field.select_one(".grants-expired-deadline")) if deadline_field else None,
        entry_fee=_field_text(article, "field-entry-amount-int"),
        cash_prize=_field_text(article, "field-cash-prize"),
        contact_email=(email_link.get("href", "").removeprefix("mailto:") or None) if email_link else None,
        official_website=urljoin(detail_url, website_link.get("href", "")) if website_link else None,
        description=_field_text(article, "body") or "",
        contact_details=_field_text(article, "field-contact-all"),
        tags=[
            tag
            for link in article.select(".field-name-taxonomy-vocabulary-8 a")
            if (tag := _text(link))
        ],
        full_text=article.get_text("\n", strip=True),
    )
