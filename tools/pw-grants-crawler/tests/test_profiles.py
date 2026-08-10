from pw_grants_crawler.profile_parser import parse_profile_detail, parse_profile_index
from pw_grants_crawler.profile_crawler import crawl_profiles
from pw_grants_crawler.models import PageSnapshot
from pw_grants_crawler.profile_source import (
    PwProfileSchema,
    next_profile_page_url,
)


def test_parse_profile_index_extracts_magazine_summary_and_profile_url():
    html = """
    <div class="view-content">
      <div class="item-list">
        <ul>
          <li class="views-row">
            <div class="views-field views-field-title">
              <h2 class="field-content title">
                <a href="/literary_magazines/sample_journal">Sample Journal</a>
              </h2>
            </div>
            <div class="views-field views-field-body">
              <div class="field-content views-field-field-description">
                <p>A journal for poems and stories.</p>
                <a class="views-more-link" href="/literary_magazines/sample_journal">Read more</a>
              </div>
            </div>
            <div class="views-field views-field-field-reading-period">
              <div class="field-content">Jan 1 to Mar 31</div>
            </div>
            <div class="views-field views-field-field-genres">
              <div class="field-content"><a>Poetry</a><a>Fiction</a></div>
            </div>
          </li>
        </ul>
      </div>
    </div>
    """

    summaries = parse_profile_index(
        html,
        "https://www.pw.org/literary_magazines",
        profile_kind="literary_magazine",
    )

    assert len(summaries) == 1
    assert summaries[0].name == "Sample Journal"
    assert summaries[0].detail_url == "https://www.pw.org/literary_magazines/sample_journal"
    assert summaries[0].summary == "A journal for poems and stories."
    assert summaries[0].reading_period == "Jan 1 to Mar 31"
    assert summaries[0].genres == ["Poetry", "Fiction"]


def test_parse_profile_detail_extracts_public_magazine_fields():
    html = """
    <article>
      <h1 id="page-title">Sample Journal</h1>
      <div class="field field-name-field-add-image">
        <div class="field-item"><img src="/files/sample.png" /></div>
      </div>
      <div class="field field-name-field-website"><div class="field-item"><a href="https://sample.test">site</a></div></div>
      <div class="field field-name-field-genres"><div class="field-item">Poetry, Fiction</div></div>
      <div class="field field-name-field-format-lm"><div class="field-item">Online, Print</div></div>
      <div class="field field-name-field-submission-guidelines-url"><div class="field-item"><a href="https://sample.test/submit">submit</a></div></div>
      <div class="field field-name-field-reading-period"><div class="field-item">Jan 1 to Mar 31</div></div>
      <div class="field field-name-field-reading-fee"><div class="field-item">No</div></div>
      <div class="field field-name-field-unsolicited-submissions"><div class="field-item">Yes</div></div>
      <div class="field field-name-field-pay"><div class="field-item">Yes</div></div>
      <div class="field field-name-field-editorial-focus"><div class="field-item">A careful journal.</div></div>
      <div class="field field-name-field-contact-first"><div class="field-item">An Editor</div></div>
      <div class="field field-name-field-contact-email"><div class="field-item"><a href="mailto:editor@sample.test">editor@sample.test</a></div></div>
      <span class="disclaimer">Please note: publisher provided. Last updated: Aug 1, 2026</span>
    </article>
    """

    detail = parse_profile_detail(
        html,
        "https://www.pw.org/literary_magazines/sample_journal",
        profile_kind="literary_magazine",
    )

    assert detail.name == "Sample Journal"
    assert detail.website_url == "https://sample.test"
    assert detail.image_url == "https://www.pw.org/files/sample.png"
    assert detail.genres == ["Poetry", "Fiction"]
    assert detail.formats == ["Online", "Print"]
    assert detail.submission_guidelines_url == "https://sample.test/submit"
    assert detail.reading_fee == "No"
    assert detail.unsolicited_submissions == "Yes"
    assert detail.payment == "Yes"
    assert detail.editorial_focus == "A careful journal."
    assert detail.contact_email == "editor@sample.test"
    assert detail.last_updated == "Aug 1, 2026"


def test_profile_schema_follows_next_page_for_both_profile_databases():
    html = """
    <ul class="pager">
      <li class="pager-next"><a href="/literary_magazines?page=1">next</a></li>
      <li class="pager-last"><a href="/literary_magazines?page=33">last</a></li>
    </ul>
    """

    magazine = PwProfileSchema("literary_magazine")
    presses = PwProfileSchema("small_press")

    assert magazine.index_url(0) == "https://www.pw.org/literary_magazines"
    assert magazine.index_url(1) == "https://www.pw.org/literary_magazines?page=1"
    assert presses.index_url(0) == "https://www.pw.org/small_presses"
    assert next_profile_page_url(html, magazine.index_url(0)) == magazine.index_url(1)


def test_profile_schema_supports_resumable_pages_and_global_rank_offset():
    schema = PwProfileSchema("literary_magazine", start_page=4)

    assert schema.index_url(schema.start_page) == "https://www.pw.org/literary_magazines?page=4"

    page_url = schema.index_url(schema.start_page)
    detail_url = "https://www.pw.org/literary_magazines/resumed"
    pages = {
        page_url: """
        <div class="view-content"><div class="views-row">
          <div class="views-field-title"><a href="/literary_magazines/resumed">Resumed Journal</a></div>
        </div></div>
        """,
        detail_url: '<article><h1 id="page-title">Resumed Journal</h1></article>',
    }

    result = crawl_profiles(schema, _FakeFetcher(pages))

    assert result.rank_offset == 100
    assert result.profiles[0].summary.name == "Resumed Journal"


def test_parse_profile_detail_supports_small_press_specific_fields():
    html = """
    <article>
      <h1 id="page-title">Sample Press</h1>
      <div class="field field-name-field-genres"><div class="field-item">Poetry</div></div>
      <div class="field field-name-field-subgenre"><div class="field-item">Chapbooks, Collections</div></div>
      <div class="field field-name-field-format-sp"><div class="field-item">Paperback, E-book</div></div>
      <div class="field field-name-field-contests-only"><div class="field-item">No</div></div>
      <div class="field field-name-field-titles-per-year"><div class="field-item">6 to 10</div></div>
      <div class="field field-name-field-editorial-tips"><div class="field-item">Read our catalogue.</div></div>
    </article>
    """

    detail = parse_profile_detail(
        html,
        "https://www.pw.org/small_presses/sample_press",
        profile_kind="small_press",
    )

    assert detail.book_types == ["Chapbooks", "Collections"]
    assert detail.formats == ["Paperback", "E-book"]
    assert detail.publishes_through_contests_only == "No"
    assert detail.titles_per_year == "6 to 10"
    assert detail.editorial_tips == "Read our catalogue."


class _FakeFetcher:
    def __init__(self, pages: dict[str, str]):
        self.pages = pages
        self.urls: list[str] = []

    def fetch(self, url: str) -> PageSnapshot:
        self.urls.append(url)
        html = self.pages[url]
        return PageSnapshot(
            requested_url=url,
            final_url=url,
            status_code=200,
            content_type="text/html",
            html=html,
            title="PW profile",
            text=" ".join(html.split()),
        )


def test_crawl_profiles_follows_all_index_pages_deduplicates_and_fetches_details():
    schema = PwProfileSchema("literary_magazine")
    first_page = schema.index_url(0)
    second_page = schema.index_url(1)
    first_detail = "https://www.pw.org/literary_magazines/first"
    second_detail = "https://www.pw.org/literary_magazines/second"
    index_template = """
    <div class="view-content"><div class="views-row">
      <div class="views-field-title"><a href="{href}">{name}</a></div>
      <div class="views-field-field-reading-period"><div class="field-content">Jan 1 to Dec 31</div></div>
    </div></div>{pager}
    """
    detail_html = """
    <article><h1 id="page-title">{name}</h1>
      <div class="field field-name-field-website"><div class="field-item"><a href="https://example.test">site</a></div></div>
    </article>
    """
    pages = {
        first_page: index_template.format(
            href="/literary_magazines/first",
            name="First Journal",
            pager=f'<ul class="pager"><li class="pager-next"><a href="{second_page}">next</a></li></ul>',
        ),
        second_page: index_template.format(
            href="/literary_magazines/first",
            name="First Journal",
            pager="",
        )
        + index_template.format(href="/literary_magazines/second", name="Second Journal", pager=""),
        first_detail: detail_html.format(name="First Journal"),
        second_detail: detail_html.format(name="Second Journal"),
    }
    fetcher = _FakeFetcher(pages)

    result = crawl_profiles(
        schema,
        fetcher,
        detail_concurrency=2,
        detail_fetcher_factory=lambda: _FakeFetcher(pages),
    )

    assert [profile.summary.name for profile in result.profiles] == [
        "First Journal",
        "Second Journal",
    ]
    assert len(result.index_pages) == 2
    assert [profile.detail.name for profile in result.profiles] == [
        "First Journal",
        "Second Journal",
    ]
    assert fetcher.urls == [first_page, second_page]
