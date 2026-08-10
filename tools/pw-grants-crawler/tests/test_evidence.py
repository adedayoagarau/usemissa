from datetime import date

from pw_grants_crawler.evidence import _deadline_is_similar, build_host_evidence
from pw_grants_crawler.models import CallDetail, PageSnapshot


def _page(url: str, html: str) -> PageSnapshot:
    return PageSnapshot(url, url, 200, "text/html", html, "", "")


class FakeFetcher:
    def __init__(self, pages: dict[str, PageSnapshot]):
        self.pages = pages
        self.urls: list[str] = []

    def fetch(self, url: str) -> PageSnapshot:
        self.urls.append(url)
        return self.pages[url]


def test_host_evidence_discovers_and_validates_a_specific_contest_page():
    root_url = "https://gival.example/"
    contest_url = "https://gival.example/contests/short-story-award"
    detail = CallDetail(
        "Gival Press",
        "Short Story Award",
        "https://www.pw.org/writing_contests/short_story_award",
        date(2026, 8, 8),
        None,
        "$25",
        "$1,000",
        None,
        root_url,
        "A short story prize.",
        None,
        ["short stories"],
        "Short Story Award",
    )
    homepage = _page(
        root_url,
        '<html><body><h1>Gival Press</h1><a href="/contests/short-story-award">Short Story Award</a></body></html>',
    )
    contest = _page(
        contest_url,
        "<html><title>Short Story Award</title><body>Gival Press Short Story Award. Deadline: August 8, 2026. Entry fee: $25. Prize: $1,000.</body></html>",
    )
    fetcher = FakeFetcher({root_url: homepage, contest_url: contest})

    evidence = build_host_evidence(detail, homepage, fetcher, max_pages=3)

    assert evidence.status == "verified"
    assert evidence.selected_page is not None
    assert evidence.selected_page.final_url == contest_url
    assert evidence.discovered_urls == [contest_url]
    assert evidence.fields["deadline"] == "August 8, 2026"
    assert evidence.fields["entry_fee"] == "$25"
    assert evidence.fields["cash_prize"] == "$1,000"


def test_host_evidence_uses_renderer_for_a_javascript_shell():
    url = "https://futurepoem.example/other-futures"
    detail = CallDetail(
        "Futurepoem",
        "Other Futures Award",
        "https://www.pw.org/writing_contests/other_futures_award",
        date(2026, 8, 15),
        None,
        "$28",
        "$1,000",
        None,
        url,
        "An innovative writing award.",
        None,
        ["Cross-Genre"],
        "Other Futures Award",
    )
    shell = _page(url, "<html><body>This site requires JavaScript to function properly.</body></html>")
    rendered = PageSnapshot(
        url,
        url,
        200,
        "text/html",
        "<html><title>Other Futures Award</title><body>Futurepoem Other Futures Award. "
            "Submissions will be open from July 15 - August 15, 2026. The selected manuscript "
            "receives publication and an advance of $1,000. Submit online.</body></html>",
            "Other Futures Award",
            "Futurepoem Other Futures Award. Submissions will be open from July 15 - August 15, 2026. "
            "The selected manuscript receives publication and an advance of $1,000. Submit online.",
        rendered=True,
    )

    class Renderer:
        def fetch(self, requested_url: str) -> PageSnapshot:
            assert requested_url == url
            return rendered

    evidence = build_host_evidence(detail, shell, FakeFetcher({}), renderer=Renderer())

    assert evidence.status == "verified"
    assert evidence.selected_page is rendered
    assert evidence.selected_page.rendered is True
    assert evidence.fields["deadline"] == "July 15 - August 15, 2026"
    assert evidence.fields["cash_prize"] == "$1,000"
    assert evidence.fields["submission_method"] == "online"


def test_host_evidence_does_not_call_an_unrelated_200_page_verified():
    url = "https://example.test/"
    detail = CallDetail(
        "Expected Press",
        "Expected Award",
        "https://www.pw.org/writing_contests/expected_award",
        date(2026, 8, 15),
        None,
        "$10",
        "$500",
        None,
        url,
        "An award.",
        None,
        [],
        "Expected Award",
    )
    page = _page(
        url,
        "<html><title>Home</title><body>"
        + ("Unrelated site information and contact details. " * 20)
        + "</body></html>",
    )

    evidence = build_host_evidence(detail, page, FakeFetcher({}), max_pages=2)

    assert evidence.status == "mismatch"
    assert evidence.match_score == 0
    assert "deadline" in evidence.missing_fields


def test_host_evidence_does_not_use_substring_tokens_as_identity_evidence():
    url = "https://gival.example/"
    detail = CallDetail(
        "Gival Press",
        "Short Story Award",
        "https://www.pw.org/writing_contests/short_story_award",
        date(2026, 8, 8),
        None,
        "$25",
        "$1,000",
        None,
        url,
        "A short story prize.",
        None,
        [],
        "Short Story Award",
    )
    page = _page(
        url,
        "<html><title>A History of Echoes</title><body>"
        "<h1>Gival Press</h1><p>The lines are short, but this is not the expected call. "
        "This page contains enough unrelated prose to avoid the thin-page renderer branch.</p>"
        "</body></html>",
    )

    evidence = build_host_evidence(detail, page, FakeFetcher({}), max_pages=2)

    assert evidence.status == "partial"
    assert evidence.match_score == 0.75
    assert evidence.selected_page is page


def test_host_fields_choose_the_matching_contest_when_a_page_lists_multiple_calls():
    url = "https://grayson.example/contests"
    detail = CallDetail(
        "Grayson Books",
        "Poetry Contest",
        "https://www.pw.org/writing_contests/poetry_contest",
        date(2026, 8, 15),
        None,
        "$26",
        "$1,000",
        None,
        url,
        "A poetry contest.",
        None,
        [],
        "Poetry Contest",
    )
    page = _page(
        url,
        """<html><title>Grayson Books Poetry Contests</title><body>
        <h1>Grayson Books Poetry Contests</h1>
        <p>Chapbook Contest deadline is January 31. This is for 16-36 pages.
        Prize: $500. Reading fee of $20.</p>
        <h2>Guidelines for Grayson Books Poetry Contest: Full-Length Manuscripts</h2>
        <p>Deadline is August 15. This is for 50-90 pages. The winner receives a
        $1,000 prize. Reading fee of $26. Submit through Submittable.</p>
        </body></html>""",
    )

    evidence = build_host_evidence(detail, page, FakeFetcher({}), max_pages=2)

    assert evidence.status == "verified"
    assert evidence.fields["deadline"] == "August 15"
    assert evidence.fields["entry_fee"] == "$26"
    assert evidence.fields["cash_prize"] == "$1,000"
    assert evidence.fields["manuscript_length"] == "50-90 pages"
    assert evidence.field_candidates["deadline"] == ["January 31", "August 15"]
    assert evidence.field_conflicts == []


def test_host_evidence_flags_conflicting_fields_on_an_identified_page():
    url = "https://example.test/expected-award"
    detail = CallDetail(
        "Expected Press",
        "Expected Award",
        "https://www.pw.org/writing_contests/expected_award",
        date(2026, 8, 15),
        None,
        "$10",
        "$500",
        None,
        url,
        "An award.",
        None,
        [],
        "Expected Award",
    )
    page = _page(
        url,
        "<html><title>Expected Press Expected Award</title><body>"
        "<h1>Expected Press Expected Award</h1><p>Deadline: August 1, 2026. "
        "Entry fee: $15. Prize: $400.</p></body></html>",
    )

    evidence = build_host_evidence(detail, page, FakeFetcher({}), max_pages=2)

    assert evidence.status == "conflict"
    assert {"deadline", "entry_fee", "cash_prize"} == {
        conflict.split(":", 1)[0] for conflict in evidence.field_conflicts
    }


def test_host_is_canonical_when_identity_description_and_deadline_align():
    url = "https://academy.example/prizes/translation"
    detail = CallDetail(
        "Academy of Example Poets",
        "Harold Morton Landon Translation Award",
        "https://www.pw.org/writing_contests/harold_morton_landon_translation_award_0",
        date(2026, 2, 15),
        None,
        None,
        "$1,000",
        None,
        url,
        "A $1,000 award recognizes the work of a translator for a poetry collection translated from any language into English and published in the previous year. Publishers submit a digital copy by February 15.",
        None,
        ["Translation"],
        "Harold Morton Landon Translation Award",
    )
    page = _page(
        url,
        """<html><title>Academy prizes</title><body>
        <p>Academy of Example Poets</p>
        <h1>Harold Morton Landon Translation Award</h1>
        <p>Cash prize: $1,000. This award recognizes the work of a translator for a poetry collection translated from any language into English and published in the previous year.</p>
        <p>Submissions for the 2026 award will be accepted from October 15, 2026 to February 15, 2027. Publishers submit a digital copy by February 15.</p>
        </body></html>""",
    )

    evidence = build_host_evidence(detail, page, FakeFetcher({}), max_pages=2)

    assert evidence.status == "verified"
    assert evidence.canonical_source == "host"
    assert evidence.canonical_fields["deadline"] == "October 15, 2026 to February 15, 2027"
    assert evidence.canonical_fields["cash_prize"] == "$1,000"
    assert any("canonical" in note.casefold() for note in evidence.notes)


def test_deadline_window_is_similar_when_pw_deadline_falls_inside_host_range():
    detail = CallDetail(
        "Example Press",
        "Example Award",
        "https://www.pw.org/writing_contests/example_award",
        date(2026, 5, 15),
        None,
        None,
        None,
        None,
        "https://example.test/award",
        "An award for writers.",
        None,
        [],
        "Example Award",
    )

    assert _deadline_is_similar(
        detail,
        {"deadline": ["February 18, 2026 to June 15, 2026"]},
    )


def test_host_evidence_never_exceeds_the_page_budget_when_rendering_candidates():
    root_url = "https://futurepoem.example/"
    candidate_url = "https://futurepoem.example/other-futures"
    detail = CallDetail(
        "Futurepoem",
        "Other Futures Award",
        "https://www.pw.org/writing_contests/other_futures_award",
        date(2026, 8, 15),
        None,
        "$28",
        "$1,000",
        None,
        root_url,
        "An innovative writing award.",
        None,
        [],
        "Other Futures Award",
    )
    root = _page(
        root_url,
        '<html><title>Homepage</title><body><p>Futurepoem homepage with unrelated information and navigation. '
        'This text is intentionally long enough to exercise bounded candidate rendering.</p>'
        '<a href="/other-futures">Other Futures Award</a></body></html>',
    )
    candidate = _page(
        candidate_url,
        "<html><body>This site requires JavaScript to function properly.</body></html>",
    )
    rendered = PageSnapshot(
        candidate_url,
        candidate_url,
        200,
        "text/html",
        "<html><title>Other Futures Award</title><body>Futurepoem Other Futures Award. "
        "Deadline: August 15, 2026. Prize: $1,000.</body></html>",
        "Other Futures Award",
        "Futurepoem Other Futures Award. Deadline: August 15, 2026. Prize: $1,000.",
        rendered=True,
    )
    fetcher = FakeFetcher({root_url: root, candidate_url: candidate})

    class Renderer:
        def fetch(self, requested_url: str) -> PageSnapshot:
            assert requested_url == candidate_url
            return rendered

    evidence = build_host_evidence(
        detail,
        root,
        fetcher,
        renderer=Renderer(),
        max_pages=3,
    )

    assert len(evidence.pages) == 3
    assert evidence.selected_page is rendered
    assert fetcher.urls == [candidate_url]
