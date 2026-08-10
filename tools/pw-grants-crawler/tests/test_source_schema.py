from pw_grants_crawler.source_schema import (
    PwOrgSchema,
    calendar_month_range,
    calendar_month_urls,
    next_grants_page_url,
)


def test_next_grants_page_url_follows_the_next_unvisited_page():
    html = """
    <ul class="pager">
      <li><a href="/grants?page=1">2</a></li>
      <li><a href="/grants?page=3">last »</a></li>
    </ul>
    """

    assert next_grants_page_url(html, "https://www.pw.org/grants") == (
        "https://www.pw.org/grants?page=1"
    )


def test_calendar_month_urls_walk_across_year_boundaries():
    assert calendar_month_urls(
        "2026-11", "2027-02", "https://www.pw.org/submission_calendar/{month}"
    ) == [
        "https://www.pw.org/submission_calendar/2026-11",
        "https://www.pw.org/submission_calendar/2026-12",
        "https://www.pw.org/submission_calendar/2027-01",
        "https://www.pw.org/submission_calendar/2027-02",
    ]


def test_pw_org_schema_declares_both_grants_pagination_and_calendar_routes():
    schema = PwOrgSchema()

    assert schema.grants_index_url == "https://www.pw.org/grants"
    assert schema.calendar_url("2026-08") == "https://www.pw.org/submission_calendar/2026-08"
    assert schema.calendar_urls("2026-08", "2026-09") == [
        "https://www.pw.org/submission_calendar/2026-08",
        "https://www.pw.org/submission_calendar/2026-09",
    ]


def test_calendar_month_range_handles_year_rollover():
    assert calendar_month_range("2026-12", 2) == ("2026-12", "2027-01")
