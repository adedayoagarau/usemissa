from datetime import date

from pw_grants_crawler.crawler import crawl_calls
from pw_grants_crawler.models import CallSummary, PageSnapshot
from pw_grants_crawler.parser import parse_calendar, parse_detail, parse_index
from pw_grants_crawler.sorting import sort_calls


INDEX_HTML = """
<div class="view-content">
  <div class="views-row">
    <div class="views-field views-field-field-award-issuer">
      <h2 class="field-content title with-subtitle">Gival Press</h2>
    </div>
    <div class="views-field views-field-title">
      <h2 class="field-content title subtitle">
        <a href="/writing_contests/short_story_award">Short Story Award</a>
      </h2>
    </div>
    <div class="views-field views-field-field-cash-prize">
      <span class="field-content">$1,000</span>
    </div>
    <div class="views-field views-field-field-entry-amount-int">
      <span class="field-content">$25</span>
    </div>
    <div class="views-field views-field-field-deadline">
      <span class="field-content">8/8/26</span>
    </div>
    <div class="views-field views-field-taxonomy-vocabulary-3">
      <span class="field-content"><a href="?filter1=32">Fiction</a></span>
    </div>
    <div class="views-field views-field-body">
      <div class="field-content views-field-field-description">
        <p>A short story prize.</p><a class="views-more-link">read more</a>
      </div>
    </div>
  </div>
</div>
"""


def test_parse_index_extracts_call_fields_and_resolves_detail_url():
    calls = parse_index(INDEX_HTML, "https://www.pw.org/grants")

    assert len(calls) == 1
    assert calls[0].organizer == "Gival Press"
    assert calls[0].title == "Short Story Award"
    assert calls[0].detail_url == "https://www.pw.org/writing_contests/short_story_award"
    assert calls[0].deadline == date(2026, 8, 8)
    assert calls[0].entry_fee == "$25"
    assert calls[0].cash_prize == "$1,000"
    assert calls[0].genres == ["Fiction"]
    assert calls[0].summary == "A short story prize."


CALENDAR_HTML = """
<table class="full">
  <tbody>
    <tr class="single-day">
      <td class="single-day future" data-date="2026-08-15">
        <div class="item">
          <div class="calendar monthview">
            <div class="views-field views-field-field-award-issuer">
              <div class="field-content">Grayson Books</div>
            </div>
            <div class="views-field views-field-title">
              <span class="field-content">
                <a href="/writing_contests/poetry_contest_1">Poetry Contest</a>
              </span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  </tbody>
</table>
"""


def test_parse_calendar_extracts_deadline_and_call_detail_url():
    calls = parse_calendar(CALENDAR_HTML, "https://www.pw.org/submission_calendar/2026-08")

    assert len(calls) == 1
    assert calls[0].organizer == "Grayson Books"
    assert calls[0].title == "Poetry Contest"
    assert calls[0].detail_url == "https://www.pw.org/writing_contests/poetry_contest_1"
    assert calls[0].deadline == date(2026, 8, 15)
    assert calls[0].index_url == "https://www.pw.org/submission_calendar/2026-08"


DETAIL_HTML = """
<div id="content">
  <h1 id="page-title">Gival Press</h1>
  <h2 class="grant-listing-title">Short Story Award</h2>
  <article class="node node-grant-award">
    <div class="field field-name-field-deadline">
      <div class="field-label">Deadline:</div>
      <div class="field-item"><span content="2026-08-08T00:00:00-04:00">August 8, 2026</span>
        <span class="grants-expired-deadline">Check back later</span>
      </div>
    </div>
    <div class="field field-name-field-entry-amount-int"><div class="field-item">$25</div></div>
    <div class="field field-name-field-cash-prize"><div class="field-item">$1,000</div></div>
    <div class="field field-name-field-contact-email"><div class="field-item"><a href="mailto:givalpress@yahoo.com">givalpress@yahoo.com</a></div></div>
    <div class="field field-name-field-website"><div class="field-item"><a href="http://givalpress.com">http://givalpress.com</a></div></div>
    <div class="field field-name-body"><div class="field-item"><p>Full contest description.</p></div></div>
    <div class="field field-name-field-contact-all"><div class="field-item"><p>Organizer address and contact.</p></div></div>
    <div class="field field-name-taxonomy-vocabulary-8"><div class="field-item"><a href="/tags/short-stories">short stories</a></div></div>
  </article>
</div>
"""


def test_parse_detail_extracts_full_call_metadata():
    detail = parse_detail(DETAIL_HTML, "https://www.pw.org/writing_contests/short_story_award")

    assert detail.organizer == "Gival Press"
    assert detail.title == "Short Story Award"
    assert detail.deadline == date(2026, 8, 8)
    assert detail.deadline_note == "Check back later"
    assert detail.entry_fee == "$25"
    assert detail.cash_prize == "$1,000"
    assert detail.contact_email == "givalpress@yahoo.com"
    assert detail.official_website == "http://givalpress.com"
    assert detail.description == "Full contest description."
    assert detail.contact_details == "Organizer address and contact."
    assert detail.tags == ["short stories"]


def test_sort_calls_orders_deadline_then_title_and_places_unknown_last():
    calls = [
        CallSummary("B", "Later", "https://example.com/later", date(2026, 9, 1), None, None, [], "", "https://example.com"),
        CallSummary("A", "Earlier", "https://example.com/earlier", date(2026, 8, 8), None, None, [], "", "https://example.com"),
        CallSummary("C", "Unknown", "https://example.com/unknown", None, None, None, [], "", "https://example.com"),
    ]

    ordered = sort_calls(calls)

    assert [call.title for call in ordered] == ["Earlier", "Later", "Unknown"]


MULTI_INDEX_HTML = """
<div class="view-content">
  <div class="views-row">
    <div class="views-field-field-award-issuer"><span class="field-content">Zeta Press</span></div>
    <div class="views-field-title"><a href="/writing_contests/zeta_call">Zeta Call</a></div>
    <div class="views-field-field-deadline"><span class="field-content">8/9/26</span></div>
  </div>
  <div class="views-row">
    <div class="views-field-field-award-issuer"><span class="field-content">Alpha Press</span></div>
    <div class="views-field-title"><a href="/writing_contests/alpha_call">Alpha Call</a></div>
    <div class="views-field-field-deadline"><span class="field-content">8/8/26</span></div>
  </div>
</div>
"""


def _detail_html(organizer: str, title: str, website: str) -> str:
    return f"""
    <div id="content"><h1 id="page-title">{organizer}</h1><article class="node node-grant-award">
      <h2 class="grant-listing-title">{title}</h2>
      <div class="field field-name-field-deadline"><div class="field-item"><span content="2026-08-08T00:00:00-04:00">August 8, 2026</span></div></div>
      <div class="field field-name-field-website"><div class="field-item"><a href="{website}">{website}</a></div></div>
      <div class="field field-name-body"><div class="field-item">Full details.</div></div>
    </article></div>
    """


class FakeFetcher:
    def __init__(self, pages: dict[str, str]):
        self.pages = pages
        self.urls: list[str] = []

    def fetch(self, url: str) -> PageSnapshot:
        self.urls.append(url)
        return PageSnapshot(
            requested_url=url,
            final_url=url,
            status_code=200,
            content_type="text/html",
            html=self.pages[url],
            title="",
            text="",
        )


def test_crawl_calls_fetches_details_and_one_official_site_in_sorted_order():
    index_url = "https://www.pw.org/grants"
    pages = {
        index_url: MULTI_INDEX_HTML,
        "https://www.pw.org/writing_contests/alpha_call": _detail_html(
            "Alpha Press", "Alpha Call", "https://alpha.example/guidelines"
        ),
        "https://www.pw.org/writing_contests/zeta_call": _detail_html(
            "Zeta Press", "Zeta Call", "https://zeta.example/guidelines"
        ),
        "https://alpha.example/guidelines": "<html><title>Alpha guidelines</title><body>Alpha full site page.</body></html>",
        "https://zeta.example/guidelines": "<html><title>Zeta guidelines</title><body>Zeta full site page.</body></html>",
    }
    fetcher = FakeFetcher(pages)

    result = crawl_calls(index_url, limit=2, fetcher=fetcher)

    assert [call.detail.title for call in result.calls] == ["Alpha Call", "Zeta Call"]
    assert result.calls[0].official_site_page is not None
    assert result.calls[0].official_site_page.final_url == "https://alpha.example/guidelines"
    assert fetcher.urls == [
        index_url,
        "https://www.pw.org/writing_contests/alpha_call",
        "https://alpha.example/guidelines",
        "https://www.pw.org/writing_contests/zeta_call",
        "https://zeta.example/guidelines",
    ]
