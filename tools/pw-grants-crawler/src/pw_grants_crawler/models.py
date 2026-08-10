from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True, slots=True)
class CallSummary:
    organizer: str
    title: str
    detail_url: str
    deadline: date | None
    entry_fee: str | None
    cash_prize: str | None
    genres: list[str]
    summary: str
    index_url: str


@dataclass(frozen=True, slots=True)
class CallDetail:
    organizer: str
    title: str
    detail_url: str
    deadline: date | None
    deadline_note: str | None
    entry_fee: str | None
    cash_prize: str | None
    contact_email: str | None
    official_website: str | None
    description: str
    contact_details: str | None
    tags: list[str]
    full_text: str


@dataclass(frozen=True, slots=True)
class PageSnapshot:
    requested_url: str
    final_url: str
    status_code: int | None
    content_type: str | None
    html: str
    title: str
    text: str
    error: str | None = None
    rendered: bool = False
    resource_urls: list[str] = field(default_factory=list)
    resource_payloads: dict[str, tuple[str | None, bytes]] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class MediaAsset:
    source_page_url: str
    original_url: str
    final_url: str
    kind: str
    content_type: str | None
    status_code: int | None
    byte_size: int | None
    sha256: str | None
    local_path: str | None
    alt_text: str | None = None
    relation: str | None = None
    error: str | None = None


@dataclass(frozen=True, slots=True)
class HostEvidence:
    status: str
    selected_page: PageSnapshot | None
    pages: list[PageSnapshot]
    discovered_urls: list[str]
    fields: dict[str, str | None]
    missing_fields: list[str]
    match_score: float
    notes: list[str]
    field_candidates: dict[str, list[str]] = field(default_factory=dict)
    field_conflicts: list[str] = field(default_factory=list)
    canonical_source: str = "p_and_w"
    canonical_fields: dict[str, str | None] = field(default_factory=dict)
    canonical_reason: str | None = None


@dataclass(frozen=True, slots=True)
class CrawledCall:
    summary: CallSummary
    detail: CallDetail
    detail_page: PageSnapshot
    official_site_page: PageSnapshot | None
    official_evidence: HostEvidence | None = None


@dataclass(frozen=True, slots=True)
class CrawlResult:
    index_page: PageSnapshot
    calls: list[CrawledCall]
    index_pages: list[PageSnapshot] = field(default_factory=list)
