from pw_grants_crawler.crawler import crawl_calls
from pw_grants_crawler.models import PageSnapshot


GRANTS_PAGE_ONE = """
<div class="view-content"><div class="views-row">
  <div class="views-field-field-award-issuer"><span class="field-content">Alpha Press</span></div>
  <div class="views-field-title"><a href="/writing_contests/alpha">Alpha Call</a></div>
  <div class="views-field-field-deadline"><span class="field-content">8/8/26</span></div>
</div></div>
<a href="/grants?page=1">2</a>
"""

GRANTS_PAGE_TWO = """
<div class="view-content"><div class="views-row">
  <div class="views-field-field-award-issuer"><span class="field-content">Beta Press</span></div>
  <div class="views-field-title"><a href="/writing_contests/beta">Beta Call</a></div>
  <div class="views-field-field-deadline"><span class="field-content">8/9/26</span></div>
</div></div>
"""

CALENDAR_PAGE = """
<table><tbody><tr class="single-day" data-date="2026-08-10">
  <td class="single-day" data-date="2026-08-10"><div class="calendar monthview">
    <div class="views-field-field-award-issuer"><div class="field-content">Beta Press</div></div>
    <div class="views-field-title"><a href="/writing_contests/beta">Beta Call</a></div>
  </div></td>
  <td class="single-day" data-date="2026-08-11"><div class="calendar monthview">
    <div class="views-field-field-award-issuer"><div class="field-content">Gamma Press</div></div>
    <div class="views-field-title"><a href="/writing_contests/gamma">Gamma Call</a></div>
  </div></td>
</tr></tbody></table>
"""


def _detail_html(organizer: str, title: str) -> str:
    return f"<h1 id='page-title'>{organizer}</h1><h2 class='grant-listing-title'>{title}</h2><article class='node-grant-award'><div class='field field-name-body'><div class='field-item'>Details</div></div></article>"


class FakeFetcher:
    def __init__(self, pages: dict[str, str]):
        self.pages = pages

    def fetch(self, url: str) -> PageSnapshot:
        return PageSnapshot(
            requested_url=url,
            final_url=url,
            status_code=200,
            content_type="text/html",
            html=self.pages[url],
            title="",
            text="",
        )


def test_crawl_calls_follows_grants_pages_and_calendar_months_without_duplicate_details():
    grants_url = "https://www.pw.org/grants"
    page_two_url = "https://www.pw.org/grants?page=1"
    calendar_url = "https://www.pw.org/submission_calendar/2026-08"
    pages = {
        grants_url: GRANTS_PAGE_ONE,
        page_two_url: GRANTS_PAGE_TWO,
        calendar_url: CALENDAR_PAGE,
        "https://www.pw.org/writing_contests/alpha": _detail_html("Alpha Press", "Alpha Call"),
        "https://www.pw.org/writing_contests/beta": _detail_html("Beta Press", "Beta Call"),
        "https://www.pw.org/writing_contests/gamma": _detail_html("Gamma Press", "Gamma Call"),
    }

    result = crawl_calls(
        grants_url,
        limit=None,
        fetcher=FakeFetcher(pages),
        follow_official_sites=False,
        max_index_pages=3,
        calendar_urls=[calendar_url],
    )

    assert [call.detail.title for call in result.calls] == ["Alpha Call", "Beta Call", "Gamma Call"]
    assert len(result.index_pages) == 3
