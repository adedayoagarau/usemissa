import hashlib
import mimetypes
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Protocol
from urllib.parse import unquote, urljoin, urlparse

from bs4 import BeautifulSoup

from .models import MediaAsset, PageSnapshot


@dataclass(frozen=True, slots=True)
class BinarySnapshot:
    requested_url: str
    final_url: str
    status_code: int | None
    content_type: str | None
    content: bytes
    error: str | None = None


class AssetFetcher(Protocol):
    def fetch_binary(self, url: str, *, max_bytes: int) -> BinarySnapshot:
        ...


@dataclass(frozen=True, slots=True)
class _MediaReference:
    url: str
    kind: str
    alt_text: str | None
    relation: str
    priority: bool = False


CSS_URL_PATTERN = re.compile(r"url\(\s*[\"']?([^\"')]+)[\"']?\s*\)", re.IGNORECASE)
MEDIA_EXTENSIONS = {
    ".avif": "image",
    ".bmp": "image",
    ".gif": "image",
    ".jpeg": "image",
    ".jpg": "image",
    ".png": "image",
    ".svg": "image",
    ".webp": "image",
    ".mp3": "audio",
    ".m4a": "audio",
    ".ogg": "audio",
    ".wav": "audio",
    ".mov": "video",
    ".mp4": "video",
    ".webm": "video",
    ".pdf": "document",
    ".css": "stylesheet",
    ".woff": "font",
    ".woff2": "font",
    ".ttf": "font",
    ".otf": "font",
}


def _normalise_url(page_url: str, value: str) -> str | None:
    value = value.strip()
    if not value or value.startswith(("#", "data:", "blob:", "javascript:", "mailto:")):
        return None
    resolved = urljoin(page_url, value)
    parsed = urlparse(resolved)
    if parsed.scheme not in {"http", "https"}:
        return None
    return resolved.split("#", 1)[0]


def _srcset_urls(value: str) -> list[str]:
    candidates = re.findall(r"\s*(.+?)\s+\d+(?:\.\d+)?[wx](?:\s*,|$)", value)
    if candidates:
        return [candidate.strip() for candidate in candidates]
    return [candidate.strip().split(" ", 1)[0] for candidate in value.split(",") if candidate.strip()]


def _css_urls(css: str) -> list[str]:
    return [match.group(1).strip() for match in CSS_URL_PATTERN.finditer(css)]


def extract_media_references(page: PageSnapshot) -> list[_MediaReference]:
    soup = BeautifulSoup(page.html, "html.parser")
    references: list[_MediaReference] = []
    seen: set[str] = set()

    def add(
        value: str,
        kind: str,
        relation: str,
        alt_text: str | None = None,
        *,
        priority: bool = False,
    ) -> None:
        url = _normalise_url(page.final_url, value)
        if url is None or url in seen:
            return
        seen.add(url)
        references.append(_MediaReference(url, kind, alt_text, relation, priority))

    for tag in soup.select("meta[content]"):
        name = (tag.get("property") or tag.get("name") or "").casefold()
        if name in {"og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src"}:
            add(tag.get("content", ""), "image", f"meta.{name}")
    for tag in soup.select("img[src], source[src], video[poster], audio[src], object[data], embed[src]"):
        attribute = "poster" if tag.name == "video" else "data" if tag.name == "object" else "src"
        add(
            tag.get(attribute, ""),
            "media",
            f"{tag.name}.{attribute}",
            tag.get("alt"),
            priority=tag.get("fetchpriority", "").casefold() == "high",
        )
    for tag in soup.select("img[data-src], source[data-src]"):
        add(
            tag.get("data-src", ""),
            "image",
            f"{tag.name}.data-src",
            tag.get("alt"),
            priority=tag.get("fetchpriority", "").casefold() == "high",
        )
    for tag in soup.select("img[srcset], source[srcset]"):
        for value in _srcset_urls(tag.get("srcset", "")):
            add(
                value,
                "image",
                f"{tag.name}.srcset",
                tag.get("alt"),
                priority=tag.get("fetchpriority", "").casefold() == "high",
            )
    for tag in soup.select("link[href]"):
        rel = {item.casefold() for item in tag.get("rel", [])}
        if "stylesheet" in rel:
            add(tag.get("href", ""), "stylesheet", "link.stylesheet")
    for tag in soup.select("a[href]"):
        href = tag.get("href", "")
        if urlparse(href).path.casefold().endswith(".pdf"):
            add(href, "document", "a.href")
    for tag in soup.select("[style]"):
        for value in _css_urls(tag.get("style", "")):
            add(value, "media", "inline-style")
    for tag in soup.select("style"):
        for value in _css_urls(tag.get_text(" ", strip=True)):
            add(value, "media", "style-block")
    for value in page.resource_urls:
        add(value, "browser-resource", "browser-network")
    return references


def _kind_for(reference_kind: str, url: str, content_type: str | None) -> str:
    if reference_kind not in {"media", "browser-resource"}:
        return reference_kind
    normalized_type = (content_type or "").split(";", 1)[0].casefold()
    if normalized_type.startswith("image/"):
        return "image"
    if normalized_type.startswith("video/"):
        return "video"
    if normalized_type.startswith("audio/"):
        return "audio"
    if normalized_type == "application/pdf":
        return "document"
    if normalized_type == "text/css":
        return "stylesheet"
    if normalized_type.startswith("font/"):
        return "font"
    return MEDIA_EXTENSIONS.get(Path(urlparse(url).path).suffix.casefold(), "other")


def _extension(url: str, content_type: str | None, kind: str) -> str:
    suffix = Path(urlparse(url).path).suffix.casefold()
    if suffix and len(suffix) <= 8:
        return suffix
    guessed = mimetypes.guess_extension((content_type or "").split(";", 1)[0])
    if guessed:
        return guessed
    return {"image": ".bin", "document": ".pdf", "stylesheet": ".css"}.get(kind, ".bin")


PRIMARY_IMAGE_EXCLUSIONS = (
    "alocdn",
    "avatar",
    "arrow",
    "bluesky",
    "cart",
    "close",
    "facebook",
    "favicon",
    "icon",
    "logo",
    "menu",
    "pixel",
    "poetswriters",
    "spinner",
    "subscribe",
    "tracking",
    "twitter",
)
PRIMARY_IMAGE_HINTS = (
    "award",
    "book",
    "call",
    "contest",
    "cover",
    "grant",
    "hero",
    "prize",
    "submission",
    "winner",
)


def _image_content_type(page: PageSnapshot, reference: _MediaReference) -> str | None:
    captured = page.resource_payloads.get(reference.url)
    return captured[0] if captured is not None else None


def _looks_like_primary_image(reference: _MediaReference, page: PageSnapshot) -> bool:
    kind = _kind_for(reference.kind, reference.url, _image_content_type(page, reference))
    if kind != "image":
        return False
    haystack = unquote(f"{reference.url} {reference.alt_text or ''}").casefold()
    return not any(exclusion in haystack for exclusion in PRIMARY_IMAGE_EXCLUSIONS)


def _contains_all_tokens(text: str, value: str) -> bool:
    tokens = [token for token in re.findall(r"[a-z0-9]+", value.casefold()) if len(token) > 2]
    return bool(tokens) and all(
        re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", text) for token in tokens
    )


def _page_matches_call(page: PageSnapshot, call_title: str) -> bool:
    page_text = page.text.strip()
    if not page_text:
        soup = BeautifulSoup(page.html, "html.parser")
        page_text = (soup.body or soup).get_text(" ", strip=True)
    searchable = unquote(f"{page.final_url} {page.title} {page_text}").casefold()
    return _contains_all_tokens(searchable, call_title)


def _has_call_image_signal(reference: _MediaReference, call_title: str) -> bool:
    haystack = unquote(f"{reference.url} {reference.alt_text or ''}").casefold()
    if (
        any(hint in haystack for hint in PRIMARY_IMAGE_HINTS)
        or reference.priority
        or _contains_all_tokens(haystack, call_title)
    ):
        return True
    return False


def _is_official_host_page(page: PageSnapshot) -> bool:
    hostname = (urlparse(page.final_url).hostname or "").casefold()
    return hostname not in {"pw.org", "www.pw.org"} and not hostname.endswith(".pw.org")


def _looks_like_official_logo(reference: _MediaReference, page: PageSnapshot) -> bool:
    if not _is_official_host_page(page):
        return False
    kind = _kind_for(reference.kind, reference.url, _image_content_type(page, reference))
    if kind != "image":
        return False
    haystack = unquote(f"{reference.url} {reference.alt_text or ''}").casefold()
    exclusions = [item for item in PRIMARY_IMAGE_EXCLUSIONS if item != "logo"]
    return "logo" in haystack and not any(exclusion in haystack for exclusion in exclusions)


def _image_resolution_hint(url: str) -> int:
    hints = [
        int(value)
        for pattern in (r"(?:^|[/_,])w[_=-](\d+)", r"[?&](?:width|w)=(\d+)", r"(?:^|[+_])(\d+)w(?:[+_.&]|$)")
        for value in re.findall(pattern, unquote(url), re.IGNORECASE)
    ]
    return max(hints, default=0)


def _primary_image_score(
    reference: _MediaReference,
    page: PageSnapshot,
    preferred_terms: Iterable[str],
    page_priority: int,
) -> int:
    haystack = unquote(f"{reference.url} {reference.alt_text or ''}").casefold()
    relation = reference.relation.casefold()
    if relation == "meta.og:image":
        score = 120
    elif relation.startswith("meta.twitter"):
        score = 110
    elif relation.startswith("img."):
        score = 80
    elif relation == "browser-network":
        score = 20
    else:
        score = 50
    score += page_priority * 15
    score += min(30, _image_resolution_hint(reference.url) // 100)
    score += min(
        40,
        sum(10 for term in preferred_terms if term and term.casefold() in haystack),
    )
    score += min(
        20,
        sum(5 for hint in PRIMARY_IMAGE_HINTS if hint in haystack),
    )
    return score


class MediaCollector:
    """Download bounded, provenance-linked media referenced by a page."""

    def __init__(
        self,
        fetcher: AssetFetcher,
        *,
        max_assets_per_page: int = 25,
        max_asset_bytes: int = 5_000_000,
        max_css_depth: int = 1,
    ):
        self.fetcher = fetcher
        self.max_assets_per_page = max(0, max_assets_per_page)
        self.max_asset_bytes = max_asset_bytes
        self.max_css_depth = max(0, max_css_depth)

    def collect_page(self, page: PageSnapshot, asset_root: Path, *, scope: str) -> list[MediaAsset]:
        asset_root.mkdir(parents=True, exist_ok=True)
        queue: list[tuple[_MediaReference, int]] = [(reference, 0) for reference in extract_media_references(page)]
        seen: set[str] = set()
        assets: list[MediaAsset] = []
        while queue and len(assets) < self.max_assets_per_page:
            reference, css_depth = queue.pop(0)
            if reference.url in seen:
                continue
            seen.add(reference.url)
            asset, content = self._download_reference(page, reference, asset_root, scope)
            assets.append(asset)
            if asset.kind == "stylesheet" and css_depth < self.max_css_depth and content and asset.error is None:
                for css_url in _css_urls(content.decode("utf-8", errors="replace")):
                    resolved = _normalise_url(asset.final_url, css_url)
                    if resolved is not None:
                        queue.append((_MediaReference(resolved, "media", "stylesheet.url", None), css_depth + 1))
        return assets

    def collect_call_images(
        self,
        pages: list[PageSnapshot],
        asset_root: Path,
        *,
        scope: str,
        preferred_terms: Iterable[str] = (),
        max_images: int = 1,
    ) -> list[tuple[PageSnapshot, MediaAsset]]:
        """Select and download only the most relevant image(s) for one call."""

        asset_root.mkdir(parents=True, exist_ok=True)
        if max_images <= 0:
            return []
        preferred_terms = tuple(term for term in preferred_terms if term)
        call_title = preferred_terms[0] if preferred_terms else ""
        candidates: list[tuple[int, int, PageSnapshot, _MediaReference]] = []
        seen: set[str] = set()
        page_priority = len(pages)
        for page in pages:
            if not call_title or not _page_matches_call(page, call_title):
                page_priority -= 1
                continue
            for reference in extract_media_references(page):
                if (
                    reference.url in seen
                    or not _looks_like_primary_image(reference, page)
                    or not _has_call_image_signal(reference, call_title)
                ):
                    continue
                seen.add(reference.url)
                candidates.append(
                    (
                        _primary_image_score(reference, page, preferred_terms, page_priority),
                        -len(candidates),
                        page,
                        reference,
                    )
                )
            page_priority -= 1
        if not candidates:
            fallback_candidates: list[tuple[int, int, PageSnapshot, _MediaReference]] = []
            seen_logos: set[str] = set()
            page_priority = len(pages)
            organizer = preferred_terms[1] if len(preferred_terms) > 1 else ""
            for page in pages:
                for reference in extract_media_references(page):
                    if reference.url in seen_logos or not _looks_like_official_logo(reference, page):
                        continue
                    seen_logos.add(reference.url)
                    haystack = unquote(f"{reference.url} {reference.alt_text or ''}").casefold()
                    score = page_priority * 15 + 80
                    if organizer and organizer.casefold() in haystack:
                        score += 40
                    if reference.relation.casefold().startswith("img."):
                        score += 10
                    fallback_candidates.append(
                        (
                            score,
                            -len(fallback_candidates),
                            page,
                            _MediaReference(
                                reference.url,
                                reference.kind,
                                reference.alt_text,
                                "fallback.logo",
                                reference.priority,
                            ),
                        )
                    )
                page_priority -= 1
            candidates = fallback_candidates
        candidates.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return [
            (page, self._download_reference(page, reference, asset_root, scope)[0])
            for _, _, page, reference in candidates[:max_images]
        ]

    def _download_reference(
        self,
        page: PageSnapshot,
        reference: _MediaReference,
        asset_root: Path,
        scope: str,
    ) -> tuple[MediaAsset, bytes]:
        captured = page.resource_payloads.get(reference.url)
        if captured is not None:
            content_type, content = captured
            snapshot = BinarySnapshot(
                requested_url=reference.url,
                final_url=reference.url,
                status_code=200,
                content_type=content_type,
                content=content[: self.max_asset_bytes],
                error=(
                    f"Captured resource exceeded max_bytes={self.max_asset_bytes}"
                    if len(content) > self.max_asset_bytes
                    else None
                ),
            )
        else:
            snapshot = self.fetcher.fetch_binary(reference.url, max_bytes=self.max_asset_bytes)
        kind = _kind_for(reference.kind, snapshot.final_url, snapshot.content_type)
        content = snapshot.content
        sha256 = hashlib.sha256(content).hexdigest() if content else None
        local_path = None
        if content and not snapshot.error:
            extension = _extension(snapshot.final_url, snapshot.content_type, kind)
            relative_path = Path("assets") / scope / f"{sha256[:16]}{extension}"
            destination = asset_root / scope / f"{sha256[:16]}{extension}"
            destination.parent.mkdir(parents=True, exist_ok=True)
            if not destination.exists():
                destination.write_bytes(content)
            local_path = str(relative_path)
        return (
            MediaAsset(
                source_page_url=page.final_url,
                original_url=reference.url,
                final_url=snapshot.final_url,
                kind=kind,
                content_type=snapshot.content_type,
                status_code=snapshot.status_code,
                byte_size=len(content) if content else None,
                sha256=sha256,
                local_path=local_path,
                alt_text=reference.alt_text,
                relation=reference.relation,
                error=snapshot.error,
            ),
            content,
        )
