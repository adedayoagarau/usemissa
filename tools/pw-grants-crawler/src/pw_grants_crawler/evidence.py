import re
from datetime import date
from difflib import SequenceMatcher
from typing import Protocol
from urllib.parse import urldefrag, urljoin, urlparse

from bs4 import BeautifulSoup

from .models import CallDetail, HostEvidence, PageSnapshot


class EvidenceFetcher(Protocol):
    def fetch(self, url: str) -> PageSnapshot:
        ...


DATE_PATTERN = (
    r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2}(?:,\s+\d{4})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
)
MONEY_PATTERN = r"([$£€]\s?\d[\d,]*(?:\.\d+)?(?:\s*[kKmM])?)"
FIELD_NAMES = ("deadline", "entry_fee", "cash_prize", "submission_method", "manuscript_length")
STOP_WORDS = {"a", "an", "and", "award", "call", "contest", "for", "of", "the"}
DISCOVERY_WORDS = {"award", "competition", "contest", "guideline", "submit", "submission"}
SUBMISSION_HOSTS = {"submittable.com", "duosuma.com"}
MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def page_text(page: PageSnapshot) -> str:
    if page.text.strip():
        return page.text.strip()
    soup = BeautifulSoup(page.html, "html.parser")
    return (soup.body or soup).get_text(" ", strip=True)


def page_title(page: PageSnapshot) -> str:
    if page.title.strip():
        return page.title.strip()
    soup = BeautifulSoup(page.html, "html.parser")
    return soup.title.get_text(" ", strip=True) if soup.title else ""


def _match_text(page: PageSnapshot) -> str:
    soup = BeautifulSoup(page.html, "html.parser")
    scope = soup.select_one("main") or soup.select_one("article") or soup.body or soup
    for anchor in scope.select("a"):
        anchor.extract()
    return f"{page_title(page)} {scope.get_text(' ', strip=True)}".casefold()


def page_needs_render(page: PageSnapshot) -> bool:
    text = page_text(page)
    title = page_title(page)
    javascript_shell = "requires javascript to function" in text.casefold()
    return bool(page.error) or javascript_shell or len(text) < 80 or (not title and len(text) < 500)


def _tokens(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", value.casefold()) if token not in STOP_WORDS}


def _contains_word(text: str, token: str) -> bool:
    return re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", text) is not None


def _identity_scores(detail: CallDetail, page: PageSnapshot) -> tuple[float, float]:
    text = _match_text(page)
    title_tokens = _tokens(detail.title)
    organizer_tokens = _tokens(detail.organizer)
    title_score = (
        sum(_contains_word(text, token) for token in title_tokens) / len(title_tokens)
        if title_tokens
        else 0.0
    )
    organizer_score = (
        sum(_contains_word(text, token) for token in organizer_tokens) / len(organizer_tokens)
        if organizer_tokens
        else 0.0
    )
    return title_score, organizer_score


def _strong_identity(detail: CallDetail, page: PageSnapshot) -> bool:
    title_score, organizer_score = _identity_scores(detail, page)
    return title_score == 1.0 and organizer_score == 1.0


def _description_coverage(detail: CallDetail, page: PageSnapshot) -> float:
    expected_tokens = _tokens(detail.description)
    if len(expected_tokens) < 5:
        return 0.0
    host_tokens = _tokens(_match_text(page))
    return len(expected_tokens & host_tokens) / len(expected_tokens)


def _title_similarity(detail: CallDetail, page: PageSnapshot) -> float:
    expected = " ".join(sorted(_tokens(detail.title)))
    if not expected:
        return 0.0
    soup = BeautifulSoup(page.html, "html.parser")
    candidates = [page_title(page)]
    candidates.extend(heading.get_text(" ", strip=True) for heading in soup.select("h1, h2, h3"))
    return max(
        (
            SequenceMatcher(None, expected, " ".join(sorted(_tokens(candidate)))).ratio()
            for candidate in candidates
            if candidate.strip()
        ),
        default=0.0,
    )


def _deadline_is_similar(detail: CallDetail, candidates: dict[str, list[str]]) -> bool:
    if detail.deadline is None:
        return False
    expected = detail.deadline
    for candidate in candidates.get("deadline", []):
        parts = _date_parts(candidate)
        if any(month == expected.month and day == expected.day for month, day, _ in parts):
            return True
        if len(parts) < 2:
            continue
        start_month, start_day, start_year = parts[0]
        end_month, end_day, end_year = parts[-1]
        start_year = start_year or end_year or expected.year
        end_year = end_year or start_year or expected.year
        try:
            start = date(start_year, start_month, start_day)
            end = date(end_year, end_month, end_day)
            if end < start and (parts[0][2] is None or parts[-1][2] is None):
                end = date(end_year + 1, end_month, end_day)
        except ValueError:
            continue
        if start <= expected <= end:
            return True
    return False


def _host_canonical_assessment(
    detail: CallDetail,
    page: PageSnapshot,
    fields: dict[str, str | None],
    candidates: dict[str, list[str]],
) -> tuple[bool, str | None]:
    """Apply the explicit host-source-of-truth policy conservatively."""

    if page.error or page_needs_render(page) and not page.rendered:
        return False, None
    title_score, organizer_score = _identity_scores(detail, page)
    title_similarity = _title_similarity(detail, page)
    if title_score < 0.80 or organizer_score < 0.80 or title_similarity < 0.70:
        return False, None
    description_coverage = _description_coverage(detail, page)
    if description_coverage < 0.35 or not _deadline_is_similar(detail, candidates):
        return False, None
    available_host_fields = {
        field_name: fields[field_name]
        for field_name in ("deadline", "entry_fee", "cash_prize")
        if fields.get(field_name)
    }
    reason = (
        "Host treated as canonical: award identity matches, description coverage "
        f"is {description_coverage:.0%}, and the host deadline matches the P&W month/day."
    )
    if not available_host_fields:
        return False, None
    return True, reason


def match_score(detail: CallDetail, page: PageSnapshot) -> float:
    title_score, organizer_score = _identity_scores(detail, page)
    if title_score == 0.0 and organizer_score == 0.0:
        return 0.0
    return round((title_score + organizer_score) / 2, 3)


def _matches(pattern: str, text: str) -> list[tuple[str, int]]:
    return [
        (" ".join(match.group(1).split()), match.start(1))
        for match in re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
    ]


def _unique_matches(matches: list[tuple[str, int]]) -> list[tuple[str, int]]:
    seen: set[str] = set()
    unique: list[tuple[str, int]] = []
    for value, position in matches:
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append((value, position))
    return unique


def _field_matches(text: str) -> dict[str, list[tuple[str, int]]]:
    deadline = _matches(
        rf"\bdeadline\b[^.\n]{{0,120}}?((?:{DATE_PATTERN})(?:\s*(?:to|through|[-–])\s*(?:{DATE_PATTERN}))?)",
        text,
    )
    deadline += _matches(
        rf"\b(?:submissions?|applications?)\b[^.\n]{{0,100}}?\b(?:open|opened|accepted|accepting)\b"
        rf"[^.\n]{{0,100}}?\bfrom\s+((?:{DATE_PATTERN})(?:\s*(?:to|through|[-–])\s*(?:{DATE_PATTERN}))?)",
        text,
    )
    entry_fee = _matches(
        rf"(?:entry|reading|contest|submission)\s+fee[^$£€\d]{{0,20}}{MONEY_PATTERN}",
        text,
    )
    cash_prize = _matches(
        rf"(?:cash\s+)?prize\s*[:\-]?\s*{MONEY_PATTERN}",
        text,
    )
    cash_prize += [
        item
        for item in _matches(
            rf"{MONEY_PATTERN}\s+(?:cash\s+)?prize\b",
            text,
        )
        if not re.search(r"fee[^.]{0,20}$", text[max(0, item[1] - 30) : item[1]], re.IGNORECASE)
    ]
    cash_prize += _matches(
        rf"\b(?:advance|award\s+amount|grant)\b[^$£€\d]{{0,20}}{MONEY_PATTERN}",
        text,
    )
    range_matches = _matches(
        r"\b(\d[\d,]*\s*(?:to|through|-|–)\s*\d[\d,]*\s*(?:pages?|pgs?|words?))\b",
        text,
    )
    range_with_unit_matches = _matches(
        r"\b(\d[\d,]*\s*(?:pages?|pgs?|words?)\s+(?:to|through)\s*"
        r"\d[\d,]*\s*(?:pages?|pgs?|words?))\b",
        text,
    )
    ranges = range_matches + range_with_unit_matches
    single_matches = _matches(
        r"\b(\d[\d,]*\s*(?:pages?|pgs?|words?)(?:\s+per\s+(?:poem|entry))?)\b",
        text,
    )
    manuscript_length = ranges + [
        item
        for item in single_matches
        if not any(start <= item[1] <= start + len(value) for value, start in ranges)
    ]
    manuscript_length.sort(key=lambda item: item[1])
    lowered = text.casefold()
    if "submittable" in lowered:
        submission_method = [("Submittable", lowered.find("submittable"))]
    elif re.search(r"\be-?mail\b", text, re.IGNORECASE):
        submission_method = [
            ("email", match.start()) for match in re.finditer(r"\be-?mail\b", text, re.IGNORECASE)
        ]
    elif re.search(r"\bonline\b", text, re.IGNORECASE):
        submission_method = [
            ("online", match.start()) for match in re.finditer(r"\bonline\b", text, re.IGNORECASE)
        ]
    else:
        submission_method = []
    return {
        "deadline": _unique_matches(deadline),
        "entry_fee": _unique_matches(entry_fee),
        "cash_prize": _unique_matches(cash_prize),
        "submission_method": _unique_matches(submission_method),
        "manuscript_length": _unique_matches(manuscript_length),
    }


def _money_number(value: str) -> float | None:
    match = re.search(r"[$£€]\s*([\d,]+(?:\.\d+)?)\s*([kKmM])?", value)
    if not match:
        return None
    number = float(match.group(1).replace(",", ""))
    suffix = (match.group(2) or "").casefold()
    if suffix == "k":
        number *= 1_000
    elif suffix == "m":
        number *= 1_000_000
    return number


def _date_parts(value: str) -> list[tuple[int, int, int | None]]:
    parts: list[tuple[int, int, int | None]] = []
    pattern = (
        r"\b(?P<month>January|February|March|April|May|June|July|August|September|October|November|December)\s+"
        r"(?P<day>\d{1,2})(?:,\s*(?P<year>\d{4}))?\b|"
        r"\b(?P<nmonth>\d{1,2})[/-](?P<nday>\d{1,2})[/-](?P<nyear>\d{2,4})\b"
    )
    for match in re.finditer(pattern, value, re.IGNORECASE):
        if match.group("month"):
            parts.append(
                (
                    MONTHS[match.group("month").casefold()],
                    int(match.group("day")),
                    int(match.group("year")) if match.group("year") else None,
                )
            )
        else:
            year = int(match.group("nyear"))
            parts.append(
                (
                    int(match.group("nmonth")),
                    int(match.group("nday")),
                    year + 2000 if year < 100 else year,
                )
            )
    return parts


def _matches_expected(field_name: str, candidate: str, detail: CallDetail | None) -> bool:
    if detail is None:
        return False
    expected = {
        "deadline": detail.deadline,
        "entry_fee": detail.entry_fee,
        "cash_prize": detail.cash_prize,
    }.get(field_name)
    if expected is None:
        return False
    if field_name == "deadline" and isinstance(expected, date):
        return any(
            month == expected.month
            and day == expected.day
            and (year is None or year == expected.year)
            for month, day, year in _date_parts(candidate)
        )
    if field_name in {"entry_fee", "cash_prize"}:
        expected_number = _money_number(expected)
        candidate_number = _money_number(candidate)
        return expected_number is not None and candidate_number == expected_number
    return False


def _matches_expected_for_selection(field_name: str, candidate: str, detail: CallDetail | None) -> bool:
    if _matches_expected(field_name, candidate, detail):
        return True
    if field_name != "deadline" or detail is None or detail.deadline is None:
        return False
    return any(
        month == detail.deadline.month and day == detail.deadline.day
        for month, day, _ in _date_parts(candidate)
    )


def extract_host_field_candidates(text: str) -> dict[str, list[str]]:
    """Return every normalized field candidate found on the selected host page."""

    return {
        field_name: [value for value, _ in matches]
        for field_name, matches in _field_matches(text).items()
    }


def extract_host_fields(text: str, detail: CallDetail | None = None) -> dict[str, str | None]:
    """Choose fields, preferring values that reconcile with the P&W metadata."""

    matches = _field_matches(text)
    preferred_positions = [
        position
        for field_name in ("deadline", "entry_fee", "cash_prize")
        for value, position in matches[field_name]
        if _matches_expected_for_selection(field_name, value, detail)
    ]
    fields: dict[str, str | None] = {}
    for field_name in FIELD_NAMES:
        candidates = matches[field_name]
        if not candidates:
            fields[field_name] = None
            continue
        matching = [
            item
            for item in candidates
            if _matches_expected_for_selection(field_name, item[0], detail)
        ]
        if matching:
            fields[field_name] = matching[0][0]
        elif field_name == "manuscript_length" and preferred_positions:
            fields[field_name] = min(
                candidates,
                key=lambda item: min(abs(item[1] - position) for position in preferred_positions),
            )[0]
        else:
            fields[field_name] = candidates[0][0]
    return fields


def _field_conflicts(
    detail: CallDetail,
    fields: dict[str, str | None],
    candidates: dict[str, list[str]],
) -> list[str]:
    conflicts: list[str] = []
    expected_values = {
        "deadline": detail.deadline.isoformat() if detail.deadline else None,
        "entry_fee": detail.entry_fee,
        "cash_prize": detail.cash_prize,
    }
    for field_name, expected in expected_values.items():
        if expected is None or not candidates.get(field_name):
            continue
        if any(_matches_expected(field_name, candidate, detail) for candidate in candidates[field_name]):
            continue
        conflicts.append(
            f"{field_name}: host has {fields.get(field_name) or candidates[field_name][0]!r}; "
            f"P&W lists {expected!r}"
        )
    return conflicts


def _candidate_links(detail: CallDetail, page: PageSnapshot, max_candidates: int) -> list[str]:
    soup = BeautifulSoup(page.html, "html.parser")
    base = urlparse(page.final_url)
    target_tokens = _tokens(f"{detail.organizer} {detail.title}")
    candidates: list[tuple[int, str]] = []
    seen: set[str] = set()
    for anchor in soup.select("a[href]"):
        href = anchor.get("href", "")
        candidate, _ = urldefrag(urljoin(page.final_url, href))
        parsed = urlparse(candidate)
        if parsed.scheme not in {"http", "https"} or candidate in seen:
            continue
        host = parsed.netloc.casefold().split(":", 1)[0]
        same_host = host == base.netloc.casefold().split(":", 1)[0]
        submission_host = any(host == suffix or host.endswith(f".{suffix}") for suffix in SUBMISSION_HOSTS)
        if not same_host and not submission_host:
            continue
        label = f"{anchor.get_text(' ', strip=True)} {candidate}".casefold()
        score = sum(3 for token in target_tokens if _contains_word(label, token))
        score += sum(1 for word in DISCOVERY_WORDS if _contains_word(label, word))
        if score == 0:
            continue
        seen.add(candidate)
        candidates.append((score, candidate))
    candidates.sort(key=lambda item: (-item[0], item[1]))
    return [candidate for _, candidate in candidates[:max_candidates]]


def _url_key(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme.casefold()}://{parsed.netloc.casefold()}{path}?{parsed.query}"


def _status(
    detail: CallDetail,
    page: PageSnapshot | None,
    score: float,
    field_conflicts: list[str],
) -> str:
    if page is None or page.error:
        return "unavailable"
    if page_needs_render(page) and not page.rendered:
        return "render_required"
    if _strong_identity(detail, page):
        return "conflict" if field_conflicts else "verified"
    if score > 0:
        return "partial"
    return "mismatch"


def build_host_evidence(
    detail: CallDetail,
    initial_page: PageSnapshot,
    fetcher: EvidenceFetcher,
    *,
    renderer: EvidenceFetcher | None = None,
    max_pages: int = 5,
) -> HostEvidence:
    pages = [initial_page]
    discovered_urls: list[str] = []
    selected_page = initial_page
    page_budget = max(1, max_pages)
    seen_page_urls = {_url_key(initial_page.requested_url), _url_key(initial_page.final_url)}

    if renderer is not None and page_needs_render(selected_page) and len(pages) < page_budget:
        rendered_page = renderer.fetch(selected_page.final_url)
        pages.append(rendered_page)
        if len(page_text(rendered_page)) > len(page_text(selected_page)):
            selected_page = rendered_page

    selected_score = match_score(detail, selected_page)
    remaining = max(0, page_budget - len(pages))
    if selected_score < 1.0 and remaining:
        for candidate_url in _candidate_links(detail, selected_page, remaining):
            if len(pages) >= page_budget or _url_key(candidate_url) in seen_page_urls:
                continue
            discovered_urls.append(candidate_url)
            candidate_page = fetcher.fetch(candidate_url)
            pages.append(candidate_page)
            seen_page_urls.add(_url_key(candidate_page.requested_url))
            seen_page_urls.add(_url_key(candidate_page.final_url))
            if renderer is not None and page_needs_render(candidate_page) and len(pages) < page_budget:
                rendered_candidate = renderer.fetch(candidate_page.final_url)
                pages.append(rendered_candidate)
                if len(page_text(rendered_candidate)) > len(page_text(candidate_page)):
                    candidate_page = rendered_candidate
            candidate_score = match_score(detail, candidate_page)
            candidate_is_strong = _strong_identity(detail, candidate_page)
            selected_is_strong = _strong_identity(detail, selected_page)
            if candidate_is_strong and not selected_is_strong:
                selected_page, selected_score = candidate_page, candidate_score
            elif not selected_is_strong and candidate_score > selected_score:
                selected_page, selected_score = candidate_page, candidate_score
            if _strong_identity(detail, selected_page):
                break

    text = page_text(selected_page)
    fields = extract_host_fields(text, detail)
    candidate_matches = _field_matches(text)
    field_candidates = {
        field_name: [value for value, _ in matches]
        for field_name, matches in candidate_matches.items()
    }
    field_conflicts = _field_conflicts(detail, fields, field_candidates)
    missing_fields = [name for name in FIELD_NAMES if not fields.get(name)]
    status = _status(detail, selected_page, selected_score, field_conflicts)
    host_is_canonical, canonical_reason = _host_canonical_assessment(
        detail,
        selected_page,
        fields,
        field_candidates,
    )
    canonical_source = "host" if host_is_canonical else "p_and_w"
    canonical_fields = (
        {
            field_name: fields[field_name]
            for field_name in ("deadline", "entry_fee", "cash_prize")
            if fields.get(field_name)
        }
        if host_is_canonical
        else {}
    )
    if host_is_canonical:
        status = "verified"
    notes: list[str] = []
    if page_needs_render(initial_page) and renderer is None:
        notes.append("Initial response appears JavaScript-only or too thin for static extraction.")
    if discovered_urls:
        notes.append(f"Followed {len(discovered_urls)} bounded same-site or submission-platform link(s).")
    if not _strong_identity(detail, selected_page):
        notes.append("The host page did not contain enough organizer/title evidence to corroborate the P&W call.")
    if field_conflicts:
        if host_is_canonical:
            notes.append("Host is canonical under the configured identity, description, and deadline policy; retain P&W values as provenance.")
        else:
            notes.append("One or more host fields conflict with the P&W listing; review before publishing.")
    if canonical_reason:
        notes.append(canonical_reason)

    return HostEvidence(
        status=status,
        selected_page=selected_page,
        pages=pages,
        discovered_urls=discovered_urls,
        fields=fields,
        missing_fields=missing_fields,
        match_score=selected_score,
        notes=notes,
        field_candidates=field_candidates,
        field_conflicts=field_conflicts,
        canonical_source=canonical_source,
        canonical_fields=canonical_fields,
        canonical_reason=canonical_reason,
    )
