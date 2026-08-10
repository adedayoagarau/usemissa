import json
from datetime import date

from pw_grants_crawler.models import CallDetail, CallSummary, CrawlResult, CrawledCall, HostEvidence, PageSnapshot
from pw_grants_crawler.media import BinarySnapshot
from pw_grants_crawler.output import write_result


def _page(url: str, html: str) -> PageSnapshot:
    return PageSnapshot(url, url, 200, "text/html", html, "Page", "Body")


def test_write_result_saves_manifest_and_full_html_snapshots(tmp_path):
    summary = CallSummary(
        "Gival Press",
        "Short Story Award",
        "https://www.pw.org/writing_contests/short_story_award",
        date(2026, 8, 8),
        "$25",
        "$1,000",
        ["Fiction"],
        "A short story prize.",
        "https://www.pw.org/grants",
    )
    detail = CallDetail(
        "Gival Press",
        "Short Story Award",
        summary.detail_url,
        summary.deadline,
        None,
        summary.entry_fee,
        summary.cash_prize,
        "givalpress@yahoo.com",
        "https://givalpress.com",
        "Full details.",
        "Contact details.",
        ["short stories"],
        "Full text.",
    )
    result = CrawlResult(
        index_page=_page("https://www.pw.org/grants", "<html>index</html>"),
        calls=[
            CrawledCall(
                summary,
                detail,
                _page(summary.detail_url, "<html>detail</html>"),
                _page(detail.official_website, "<html>official</html>"),
                HostEvidence(
                    "verified",
                    _page(detail.official_website, "<html>official</html>"),
                    [_page(detail.official_website, "<html>official</html>")],
                    [],
                    {"deadline": "August 8, 2026", "entry_fee": "$25"},
                    ["cash_prize"],
                    1.0,
                    [],
                    {"deadline": ["August 8, 2026"]},
                    [],
                    "host",
                    {"deadline": "August 8, 2026", "entry_fee": "$25"},
                    "Host matched the current call.",
                ),
            )
        ],
    )

    manifest_path = write_result(result, tmp_path)

    payload = json.loads(manifest_path.read_text())
    assert payload["calls"][0]["rank"] == 1
    assert payload["calls"][0]["deadline"] == "2026-08-08"
    assert payload["calls"][0]["official_evidence"]["status"] == "verified"
    assert payload["calls"][0]["official_evidence"]["missing_fields"] == ["cash_prize"]
    assert payload["calls"][0]["official_evidence"]["field_candidates"]["deadline"] == [
        "August 8, 2026"
    ]
    assert payload["calls"][0]["official_evidence"]["field_conflicts"] == []
    assert payload["calls"][0]["official_evidence"]["canonical_source"] == "host"
    assert payload["calls"][0]["official_evidence"]["canonical_fields"]["deadline"] == "August 8, 2026"
    assert payload["calls"][0]["official_evidence"]["selected_page"]["rendered"] is False
    assert (tmp_path / "index.html").read_text() == "<html>index</html>"
    assert (tmp_path / "pages/01-gival-press-short-story-award.html").read_text() == "<html>detail</html>"
    assert (tmp_path / "official-sites/01-gival-press-short-story-award.html").read_text() == "<html>official</html>"


def test_write_result_persists_all_discovery_pages(tmp_path):
    first = _page("https://www.pw.org/grants", "<html>page one</html>")
    second = _page("https://www.pw.org/grants?page=1", "<html>page two</html>")

    manifest_path = write_result(
        CrawlResult(index_page=first, calls=[], index_pages=[first, second]),
        tmp_path,
    )

    payload = json.loads(manifest_path.read_text())
    assert len(payload["index_pages"]) == 2
    assert (tmp_path / "index-pages/01.html").read_text() == "<html>page one</html>"
    assert (tmp_path / "index-pages/02.html").read_text() == "<html>page two</html>"


def test_write_result_downloads_media_and_records_provenance(tmp_path):
    page_url = "https://example.test/call"
    summary = CallSummary(
        "Example Press",
        "Example Award",
        "https://www.pw.org/writing_contests/example_award",
        date(2026, 8, 8),
        "$10",
        "$500",
        [],
        "Example call.",
        "https://www.pw.org/grants",
    )
    detail = CallDetail(
        "Example Press",
        "Example Award",
        summary.detail_url,
        summary.deadline,
        None,
        summary.entry_fee,
        summary.cash_prize,
        None,
        page_url,
        "Example call.",
        None,
        [],
        "Example call.",
    )
    page = PageSnapshot(
        page_url,
        page_url,
        200,
        "text/html",
        """<html><head><meta property="og:image" content="/cover.jpg"></head><body>
        <h1>Example Press Example Award</h1>
        <img src="/brand-logo.svg" alt="Example logo">
        <img src="/related-story.jpg" alt="Related story">
        </body></html>""",
        "Example Award",
        "Example Press Example Award",
    )
    result = CrawlResult(
        index_page=_page("https://www.pw.org/grants", "<html>index</html>"),
        calls=[
            CrawledCall(
                summary,
                detail,
                _page(summary.detail_url, "<html>detail</html>"),
                page,
                HostEvidence("verified", page, [page], [], {}, [], 1.0, []),
            )
        ],
    )

    class AssetFetcher:
        urls = []

        def fetch_binary(self, url: str, *, max_bytes: int) -> BinarySnapshot:
            self.urls.append(url)
            payloads = {
                "https://example.test/cover.jpg": ("image/jpeg", b"cover-bytes"),
                "https://example.test/brand-logo.svg": ("image/svg+xml", b"logo-bytes"),
                "https://example.test/related-story.jpg": ("image/jpeg", b"related-bytes"),
            }
            content_type, content = payloads[url]
            return BinarySnapshot(url, url, 200, content_type, content)

    asset_fetcher = AssetFetcher()
    manifest_path = write_result(result, tmp_path, asset_fetcher=asset_fetcher)

    payload = json.loads(manifest_path.read_text())
    assets = payload["calls"][0]["media_assets"]
    assert len(assets) == 1
    assert assets[0]["kind"] == "image"
    assert assets[0]["source_page_url"] == page_url
    assert (tmp_path / assets[0]["local_path"]).read_bytes() == b"cover-bytes"
    assert asset_fetcher.urls == ["https://example.test/cover.jpg"]
