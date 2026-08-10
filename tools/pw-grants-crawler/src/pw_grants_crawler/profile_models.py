from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


ProfileKind = Literal["literary_magazine", "small_press"]


@dataclass(frozen=True, slots=True)
class ProfileSummary:
    kind: ProfileKind
    name: str
    detail_url: str
    summary: str
    reading_period: str | None
    genres: list[str] = field(default_factory=list)
    subgenres: list[str] = field(default_factory=list)
    index_url: str = ""


@dataclass(frozen=True, slots=True)
class ProfileDetail:
    kind: ProfileKind
    name: str
    detail_url: str
    website_url: str | None
    image_url: str | None
    genres: list[str]
    representative_authors: str | None
    book_types: list[str]
    formats: list[str]
    submission_guidelines_url: str | None
    reading_period: str | None
    response_time: str | None
    reading_fee: str | None
    unsolicited_submissions: str | None
    simultaneous_submissions: str | None
    payment: str | None
    editorial_focus: str | None
    editorial_tips: str | None
    contact_name: str | None
    contact_email: str | None
    contact_details: str | None
    issues_per_year: str | None
    issue_price: str | None
    subscription_price: str | None
    circulation: str | None
    titles_per_year: str | None
    publishes_through_contests_only: str | None
    last_updated: str | None
    full_text: str
