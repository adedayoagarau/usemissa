from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .profile_models import ProfileDetail, ProfileKind, ProfileSummary


def _text(node) -> str | None:
    if node is None:
        return None
    value = node.get_text(" ", strip=True)
    return value or None


def _list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.replace("\n", ",").split(",") if item.strip()]


def _field_text(root, field_name: str) -> str | None:
    return _text(root.select_one(f".field-name-{field_name} .field-item"))


def _field_link(root, field_name: str, base_url: str) -> str | None:
    node = root.select_one(f".field-name-{field_name} a[href]")
    if node is None:
        return None
    href = node.get("href")
    return urljoin(base_url, href) if href else None


def _field_image(root, base_url: str) -> str | None:
    node = root.select_one(".field-name-field-add-image img[src]")
    if node is None:
        return None
    src = node.get("src")
    return urljoin(base_url, src) if src else None


def _description(row) -> str:
    node = row.select_one(
        ".views-field-field-description, "
        ".views-field-body .views-field-field-description, "
        ".views-field-body"
    )
    if node is not None:
        paragraph = node.select_one("p")
        if paragraph is not None:
            return _text(paragraph) or ""
    return _text(node) or ""


def _reading_period(row) -> str | None:
    return _text(
        row.select_one(
            ".views-field-field-reading-period .field-content, "
            ".views-field-field-reading-period"
        )
    )


def _linked_values(row, field_names: tuple[str, ...]) -> list[str]:
    for field_name in field_names:
        links = [_text(link) for link in row.select(f".views-field-{field_name} a")]
        values = [value for value in links if value]
        if values:
            return values
        value = _text(row.select_one(f".views-field-{field_name} .field-content"))
        if value:
            return _list(value)
    return []


def parse_profile_index(
    html: str,
    index_url: str,
    *,
    profile_kind: ProfileKind,
) -> list[ProfileSummary]:
    """Parse one PW magazine or small-press listing page.

    The index is only a discovery surface. Callers decide separately whether
    the extracted source data may be persisted.
    """

    soup = BeautifulSoup(html, "html.parser")
    summaries: list[ProfileSummary] = []
    for row in soup.select(".view-content .views-row"):
        title_link = row.select_one(".views-field-title a[href]")
        if title_link is None:
            continue
        name = _text(title_link)
        href = title_link.get("href")
        if not name or not href:
            continue
        summaries.append(
            ProfileSummary(
                kind=profile_kind,
                name=name,
                detail_url=urljoin(index_url, href),
                summary=_description(row),
                reading_period=_reading_period(row),
                genres=_linked_values(row, ("field-genres", "taxonomy-vocabulary-3")),
                subgenres=_linked_values(row, ("field-subgenre", "taxonomy-vocabulary-4")),
                index_url=index_url,
            )
        )
    return summaries


def parse_profile_detail(html: str, detail_url: str, *, profile_kind: ProfileKind) -> ProfileDetail:
    """Extract the public fields from one PW profile page."""

    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one("article") or soup
    email_link = root.select_one(".field-name-field-contact-email a[href]")
    email_href = email_link.get("href", "") if email_link else ""
    contact_email = email_href.removeprefix("mailto:") or _text(email_link)
    disclaimer = " ".join(
        text
        for text in (_text(node) for node in root.select(".disclaimer"))
        if text
    )
    last_updated = None
    marker = "Last updated:"
    if marker in disclaimer:
        last_updated = disclaimer.split(marker, 1)[1].strip()
    contact_parts = [
        _field_text(root, field_name)
        for field_name in (
            "field-address-0",
            "field-city",
            "field-state",
            "field-zip",
            "field-country",
        )
    ]
    contact_details = ", ".join(part for part in contact_parts if part) or None
    genres = _list(_field_text(root, "field-genres"))
    book_types = _list(_field_text(root, "field-subgenre"))
    formats = _list(_field_text(root, "field-format-lm")) or _list(
        _field_text(root, "field-format-sp")
    )
    return ProfileDetail(
        kind=profile_kind,
        name=_text(soup.select_one("#page-title")) or "",
        detail_url=detail_url,
        website_url=_field_link(root, "field-website", detail_url),
        image_url=_field_image(root, detail_url),
        genres=genres,
        representative_authors=_field_text(root, "field-representative-authors"),
        book_types=book_types,
        formats=formats,
        submission_guidelines_url=_field_link(root, "field-submission-guidelines-url", detail_url),
        reading_period=_field_text(root, "field-reading-period"),
        response_time=_field_text(root, "field-reporting-time"),
        reading_fee=_field_text(root, "field-reading-fee"),
        unsolicited_submissions=_field_text(root, "field-unsolicited-submissions"),
        simultaneous_submissions=_field_text(root, "field-simultaneous"),
        payment=_field_text(root, "field-pay"),
        editorial_focus=_field_text(root, "field-editorial-focus"),
        editorial_tips=_field_text(root, "field-editorial-tips"),
        contact_name=_field_text(root, "field-contact-first"),
        contact_email=contact_email,
        contact_details=contact_details,
        issues_per_year=_field_text(root, "field-issues-per-year"),
        issue_price=_field_text(root, "field-issue-price"),
        subscription_price=_field_text(root, "field-subscription-price"),
        circulation=_field_text(root, "field-circulation"),
        titles_per_year=_field_text(root, "field-titles-per-year"),
        publishes_through_contests_only=_field_text(root, "field-contests-only"),
        last_updated=last_updated,
        full_text=root.get_text("\n", strip=True),
    )
