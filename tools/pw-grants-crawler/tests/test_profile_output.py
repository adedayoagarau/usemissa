import json

from pw_grants_crawler.media import BinarySnapshot
from pw_grants_crawler.models import PageSnapshot
from pw_grants_crawler.profile_models import ProfileDetail, ProfileSummary
from pw_grants_crawler.profile_crawler import CrawledProfile, ProfileCrawlResult
from pw_grants_crawler.profile_output import write_profile_result


def _page(url: str, html: str) -> PageSnapshot:
    return PageSnapshot(url, url, 200, "text/html", html, "PW profile", "Profile text")


def _detail(url: str) -> ProfileDetail:
    return ProfileDetail(
        kind="literary_magazine",
        name="Sample Journal",
        detail_url=url,
        website_url="https://sample.test",
        image_url="https://www.pw.org/files/sample.png",
        genres=["Poetry"],
        representative_authors="An Author",
        book_types=[],
        formats=["Online"],
        submission_guidelines_url="https://sample.test/submit",
        reading_period="Jan 1 to Dec 31",
        response_time="Less than 3 months",
        reading_fee="No",
        unsolicited_submissions="Yes",
        simultaneous_submissions="Yes",
        payment="Yes",
        editorial_focus="A careful journal.",
        editorial_tips=None,
        contact_name="An Editor",
        contact_email="editor@sample.test",
        contact_details="1 Main Street",
        issues_per_year="4",
        issue_price=None,
        subscription_price=None,
        circulation="Less than 1,000",
        titles_per_year=None,
        publishes_through_contests_only=None,
        last_updated="Aug 1, 2026",
        full_text="Sample profile text.",
    )


def test_write_profile_result_saves_pages_manifest_and_one_profile_image(tmp_path):
    index = _page(
        "https://www.pw.org/literary_magazines",
        "<html><body>index</body></html>",
    )
    detail_page = _page(
        "https://www.pw.org/literary_magazines/sample_journal",
        "<html><body>detail</body></html>",
    )
    summary = ProfileSummary(
        kind="literary_magazine",
        name="Sample Journal",
        detail_url=detail_page.requested_url,
        summary="A journal.",
        reading_period="Jan 1 to Dec 31",
        genres=["Poetry"],
        index_url=index.requested_url,
    )

    class AssetFetcher:
        def fetch_binary(self, url: str, *, max_bytes: int) -> BinarySnapshot:
            assert url == "https://www.pw.org/files/sample.png"
            return BinarySnapshot(url, url, 200, "image/png", b"image-bytes")

    manifest_path = write_profile_result(
        ProfileCrawlResult(
            index_pages=[index],
            profiles=[CrawledProfile(summary, _detail(detail_page.requested_url), detail_page)],
        ),
        tmp_path,
        asset_fetcher=AssetFetcher(),
    )

    payload = json.loads(manifest_path.read_text())
    profile = payload["profiles"][0]
    assert profile["kind"] == "literary_magazine"
    assert profile["name"] == "Sample Journal"
    assert profile["detail"]["website_url"] == "https://sample.test"
    assert profile["media_assets"][0]["relation"] == "profile.image"
    assert (tmp_path / profile["media_assets"][0]["local_path"]).read_bytes() == b"image-bytes"
    assert (tmp_path / "index-pages/01.html").read_text() == "<html><body>index</body></html>"
    assert (tmp_path / "profiles/001-sample-journal.html").read_text() == "<html><body>detail</body></html>"
