from pathlib import Path

from pw_grants_crawler.media import BinarySnapshot, MediaCollector
from pw_grants_crawler.models import PageSnapshot


class FakeAssetFetcher:
    def __init__(self, responses: dict[str, bytes]):
        self.responses = responses
        self.urls: list[str] = []

    def fetch_binary(self, url: str, *, max_bytes: int) -> BinarySnapshot:
        self.urls.append(url)
        content = self.responses[url]
        return BinarySnapshot(
            requested_url=url,
            final_url=url,
            status_code=200,
            content_type={
                ".css": "text/css",
                ".jpg": "image/jpeg",
                ".webp": "image/webp",
                ".pdf": "application/pdf",
                ".mp4": "video/mp4",
            }.get(Path(url).suffix, "application/octet-stream"),
            content=content,
        )


def test_media_collector_downloads_bounded_page_assets_and_css_media(tmp_path):
    page_url = "https://example.test/call"
    responses = {
        "https://example.test/styles.css": b".hero { background: url('/background.webp'); }",
        "https://example.test/cover-small.jpg": b"small-image",
        "https://example.test/cover-large.jpg": b"large-image",
        "https://example.test/transformed/w_100,h_88,q_80/cover.jpg": b"transformed-image",
        "https://example.test/background.webp": b"background-image",
        "https://example.test/guidelines.pdf": b"pdf-bytes",
        "https://example.test/trailer.mp4": b"video-bytes",
    }
    page = PageSnapshot(
        page_url,
        page_url,
        200,
        "text/html",
        """<html><head><link rel="stylesheet" href="/styles.css"></head><body>
        <img srcset="/transformed/w_100,h_88,q_80/cover.jpg 1x, /cover-large.jpg 2x" alt="Cover">
        <a href="/guidelines.pdf">Guidelines PDF</a>
        <video poster="/cover-small.jpg"><source src="/trailer.mp4"></video>
        </body></html>""",
        "Call",
        "Call",
        resource_urls=["https://cdn.example.test/hero.jpg"],
        resource_payloads={"https://cdn.example.test/hero.jpg": ("image/jpeg", b"browser-image")},
    )
    fetcher = FakeAssetFetcher(responses)

    assets = MediaCollector(fetcher, max_assets_per_page=10).collect_page(
        page,
        tmp_path / "assets",
        scope="01-call",
    )

    assert {asset.kind for asset in assets} == {"stylesheet", "image", "document", "video"}
    assert {asset.original_url for asset in assets} == set(responses) | {"https://cdn.example.test/hero.jpg"}
    assert all(asset.local_path is not None for asset in assets)
    assert all((tmp_path / asset.local_path).exists() for asset in assets if asset.local_path)
    assert set(fetcher.urls) == set(responses)
    assert fetcher.urls.count("https://example.test/styles.css") == 1


def test_media_collector_selects_one_primary_call_image(tmp_path):
    page_url = "https://example.test/call"
    page = PageSnapshot(
        page_url,
        page_url,
        200,
        "text/html",
        """<html><head>
        <meta property="og:image" content="/call-photo.jpg">
        </head><body>
        <img src="/brand-logo.svg" alt="Example logo">
        <img src="/related-story.jpg" alt="Related story">
        </body></html>""",
        "Example Award",
        "Example Press Example Award",
        resource_urls=["https://cdn.example.test/site-font.woff2"],
    )
    fetcher = FakeAssetFetcher(
        {
            "https://example.test/call-photo.jpg": b"call-photo",
            "https://example.test/related-story.jpg": b"related-story",
        }
    )

    selected = MediaCollector(fetcher).collect_call_images(
        [page],
        tmp_path / "assets",
        scope="01-call",
        preferred_terms=["Example Award", "Example Press"],
    )

    assert len(selected) == 1
    selected_page, asset = selected[0]
    assert selected_page is page
    assert asset.original_url == "https://example.test/call-photo.jpg"
    assert asset.kind == "image"
    assert fetcher.urls == ["https://example.test/call-photo.jpg"]


def test_media_collector_does_not_treat_tracking_pixel_as_call_image(tmp_path):
    page_url = "https://example.test/call"
    page = PageSnapshot(
        page_url,
        page_url,
        200,
        "text/html",
        '<img src="https://p.alocdn.com/c/p5fr10ok/a/etarget/p.gif?label=poetswriters">',
        "Example Award",
        "Example Press Example Award",
    )
    fetcher = FakeAssetFetcher({})

    selected = MediaCollector(fetcher).collect_call_images(
        [page], tmp_path / "assets", scope="01-call"
    )

    assert selected == []
    assert fetcher.urls == []


def test_media_collector_omits_generic_brand_image_without_call_signal(tmp_path):
    page_url = "https://example.test/call"
    page = PageSnapshot(
        page_url,
        page_url,
        200,
        "text/html",
        """<html><head><meta property="og:image" content="/og-image.jpg"></head>
        <body><h1>Example Press Example Award</h1>
        <img src="/person.jpg" alt="Person"></body></html>""",
        "Example Award",
        "Example Press Example Award",
    )
    fetcher = FakeAssetFetcher(
        {
            "https://example.test/og-image.jpg": b"brand-image",
            "https://example.test/person.jpg": b"person-image",
        }
    )

    selected = MediaCollector(fetcher).collect_call_images(
        [page], tmp_path / "assets", scope="01-call", preferred_terms=["Example Award"]
    )

    assert selected == []
    assert fetcher.urls == []


def test_media_collector_falls_back_to_official_organizer_logo(tmp_path):
    page_url = "https://example.test/call"
    page = PageSnapshot(
        page_url,
        page_url,
        200,
        "text/html",
        """<html><body><h1>Example Award</h1>
        <img src="/brand-logo.svg" alt="Example Press logo">
        </body></html>""",
        "Example Award",
        "Example Press Example Award",
    )
    fetcher = FakeAssetFetcher({"https://example.test/brand-logo.svg": b"logo-bytes"})

    selected = MediaCollector(fetcher).collect_call_images(
        [page],
        tmp_path / "assets",
        scope="01-call",
        preferred_terms=["Example Award", "Example Press"],
    )

    assert len(selected) == 1
    selected_page, asset = selected[0]
    assert selected_page is page
    assert asset.original_url == "https://example.test/brand-logo.svg"
    assert asset.kind == "image"
    assert fetcher.urls == ["https://example.test/brand-logo.svg"]
