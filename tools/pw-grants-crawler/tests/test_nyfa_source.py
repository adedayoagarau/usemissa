from pw_grants_crawler.nyfa_source import nyfa_call_urls, parse_nyfa_detail


def test_nyfa_archive_keeps_only_canonical_grant_pages():
    html = """
    <main>
      <a href="/awards-grants/first-grant/">First</a>
      <a href="https://www.nyfa.org/awards-grants/first-grant/#apply">duplicate</a>
      <a href="/about/">About</a>
      <a href="https://submittable.com/nyfa">Apply</a>
    </main>
    """
    assert nyfa_call_urls(html) == ["https://www.nyfa.org/awards-grants/first-grant"]


def test_nyfa_detail_preserves_source_text_and_deadline():
    detail = parse_nyfa_detail(
        """
        <html><head><title>First Grant - NYFA</title></head><body>
          <main><h1>First Grant</h1>
          <p>Applications close Tuesday, April 7, 2026 at 5:00 PM ET.</p>
          <p>This grant supports artists developing public visual arts projects.</p>
          </main>
        </body></html>
        """,
        "https://www.nyfa.org/awards-grants/first-grant",
    )
    assert detail.title == "First Grant"
    assert detail.deadline.isoformat() == "2026-04-07"
    assert "supports artists" in detail.description
    assert detail.organizer == "New York Foundation for the Arts"
