import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from difflib import SequenceMatcher
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


TRACKING_QUERY_KEYS = {
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "source",
}


def normalize_text(value: str | None) -> str:
    """Normalize human labels for conservative identity comparisons."""

    if not value:
        return ""
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", without_marks.casefold())).strip()


def normalize_url(value: str | None) -> str:
    """Return a stable URL key while removing fragments and tracking noise."""

    if not value:
        return ""
    try:
        parsed = urlsplit(value.strip())
    except ValueError:
        return value.strip().casefold().rstrip("/")
    if parsed.scheme.casefold() not in {"http", "https"} or not parsed.netloc:
        return value.strip().casefold().rstrip("/")
    hostname = parsed.hostname.casefold() if parsed.hostname else ""
    hostname = hostname.removeprefix("www.")
    port = parsed.port
    netloc = hostname
    if port and not ((parsed.scheme.casefold() == "https" and port == 443) or (parsed.scheme.casefold() == "http" and port == 80)):
        netloc = f"{hostname}:{port}"
    query = [
        (key, query_value)
        for key, query_value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.casefold() not in TRACKING_QUERY_KEYS and not key.casefold().startswith("utm_")
    ]
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit((parsed.scheme.casefold(), netloc, path, urlencode(query), "")).rstrip("/")


def identity_key(organizer: str | None, title: str | None, deadline: date | str | None) -> str:
    if isinstance(deadline, date):
        deadline_key = deadline.isoformat()
    elif deadline:
        deadline_key = str(deadline)
    else:
        deadline_key = "unknown"
    return f"call:{normalize_text(organizer)}|{normalize_text(title)}|{deadline_key}"


@dataclass(frozen=True, slots=True)
class IdentityInput:
    organizer: str
    title: str
    deadline: date | str | None
    detail_url: str | None
    official_url: str | None


@dataclass(frozen=True, slots=True)
class IdentityRecord:
    id: str
    organizer: str
    title: str
    deadline: date | str | None
    detail_url: str | None
    official_url: str | None
    aliases: tuple[str, ...] = ()
    detail_aliases: tuple[str, ...] = ()
    official_aliases: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class IdentityResolution:
    action: Literal["attach", "create", "review"]
    matched_id: str | None
    reason: str
    confidence: float
    candidate_ids: tuple[str, ...] = ()


def _same_url(left: str | None, right: str | None) -> bool:
    return bool(left and right and normalize_url(left) == normalize_url(right))


def resolve_identity(
    incoming: IdentityInput,
    existing: list[IdentityRecord],
) -> IdentityResolution:
    """Resolve an observation without silently merging ambiguous opportunities.

    Exact identity keys and exact source URLs attach automatically. Similar
    labels with different deadlines remain review candidates so annual calls
    are not accidentally collapsed into one record.
    """

    incoming_key = identity_key(incoming.organizer, incoming.title, incoming.deadline)
    for record in existing:
        if identity_key(record.organizer, record.title, record.deadline) == incoming_key:
            return IdentityResolution("attach", record.id, "organizer_title_deadline", 0.99)

    for record in existing:
        if any(
            _same_url(incoming.detail_url, record_url)
            for record_url in (record.detail_url, *record.detail_aliases, *record.aliases)
        ):
            return IdentityResolution("attach", record.id, "exact_url_alias", 1.0)

    incoming_official = normalize_url(incoming.official_url)
    incoming_title = normalize_text(incoming.title)
    for record in existing:
        if (
            incoming_official
            and any(
                incoming_official == normalize_url(record_url)
                for record_url in (record.official_url, *record.official_aliases)
            )
            and incoming_title == normalize_text(record.title)
        ):
            return IdentityResolution("attach", record.id, "official_url_title", 0.97)

    candidate_ids: list[str] = []
    incoming_organizer = normalize_text(incoming.organizer)
    for record in existing:
        organizer_score = SequenceMatcher(None, incoming_organizer, normalize_text(record.organizer)).ratio()
        title_score = SequenceMatcher(None, incoming_title, normalize_text(record.title)).ratio()
        if organizer_score >= 0.90 and title_score >= 0.88:
            candidate_ids.append(record.id)

    if candidate_ids:
        return IdentityResolution("review", None, "similar_identity", 0.85, tuple(candidate_ids))
    return IdentityResolution("create", None, "no_identity_match", 0.0)
