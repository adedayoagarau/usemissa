import time
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from .media import BinarySnapshot
from .models import PageSnapshot


class HttpFetcher:
    def __init__(
        self,
        *,
        client: httpx.Client | None = None,
        timeout: float = 30.0,
        max_bytes: int = 5_000_000,
        user_agent: str = "Missa-PW-Grants-Crawler/0.1 (+https://usemissa.com)",
        min_request_interval: float = 0.0,
        max_retries: int = 0,
        retry_backoff_seconds: float = 1.0,
    ):
        self.client = client or httpx.Client(
            follow_redirects=True,
            timeout=timeout,
            headers={"User-Agent": user_agent, "Accept": "text/html,application/xhtml+xml"},
        )
        self.max_bytes = max_bytes
        self.min_request_interval = max(0.0, min_request_interval)
        self.max_retries = max(0, max_retries)
        self.retry_backoff_seconds = max(0.0, retry_backoff_seconds)
        self._last_request_started_at = 0.0

    def close(self) -> None:
        self.client.close()

    def _get(self, url: str) -> tuple[httpx.Response | None, str | None]:
        for attempt in range(self.max_retries + 1):
            wait_seconds = self.min_request_interval - (
                time.monotonic() - self._last_request_started_at
            )
            if wait_seconds > 0:
                time.sleep(wait_seconds)
            self._last_request_started_at = time.monotonic()
            try:
                response = self.client.get(url)
            except httpx.HTTPError as exc:
                return None, str(exc)
            if response.status_code != 429 or attempt >= self.max_retries:
                return response, None
            retry_after = response.headers.get("retry-after")
            try:
                retry_delay = float(retry_after) if retry_after else 0.0
            except ValueError:
                retry_delay = 0.0
            retry_delay = max(
                retry_delay,
                self.retry_backoff_seconds * (2**attempt),
            )
            time.sleep(min(retry_delay, 60.0))
        return None, "retry loop exhausted"

    def fetch(self, url: str) -> PageSnapshot:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError(f"Unsupported URL scheme: {url}")
        response, request_error = self._get(url)
        if response is None:
            return PageSnapshot(
                requested_url=url,
                final_url=url,
                status_code=None,
                content_type=None,
                html="",
                title="",
                text="",
                error=request_error or "request failed",
            )

        if len(response.content) > self.max_bytes:
            return PageSnapshot(
                requested_url=url,
                final_url=str(response.url),
                status_code=response.status_code,
                content_type=response.headers.get("content-type"),
                html="",
                title="",
                text="",
                error=f"Response exceeded max_bytes={self.max_bytes}",
            )

        html = response.text
        soup = BeautifulSoup(html, "html.parser")
        body = soup.body or soup
        return PageSnapshot(
            requested_url=url,
            final_url=str(response.url),
            status_code=response.status_code,
            content_type=response.headers.get("content-type"),
            html=html,
            title=soup.title.get_text(" ", strip=True) if soup.title else "",
            text=body.get_text(" ", strip=True),
            error=None if response.is_success else f"HTTP {response.status_code}",
        )

    def fetch_binary(self, url: str, *, max_bytes: int | None = None) -> BinarySnapshot:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError(f"Unsupported URL scheme: {url}")
        byte_limit = self.max_bytes if max_bytes is None else max_bytes
        response, request_error = self._get(url)
        if response is None:
            return BinarySnapshot(url, url, None, None, b"", request_error or "request failed")
        if len(response.content) > byte_limit:
            return BinarySnapshot(
                url,
                str(response.url),
                response.status_code,
                response.headers.get("content-type"),
                b"",
                f"Response exceeded max_bytes={byte_limit}",
            )
        return BinarySnapshot(
            url,
            str(response.url),
            response.status_code,
            response.headers.get("content-type"),
            response.content,
            (
                None
                if response.is_success and response.content
                else "Empty response body"
                if response.is_success
                else f"HTTP {response.status_code}"
            ),
        )
