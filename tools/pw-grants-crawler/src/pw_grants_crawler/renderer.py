from .models import PageSnapshot


class PlaywrightFetcher:
    """Render pages that cannot be understood from the static HTTP response."""

    def __init__(
        self,
        *,
        timeout: float = 30.0,
        max_bytes: int = 5_000_000,
        user_agent: str = "Missa-PW-Grants-Crawler/0.1 (+https://usemissa.com)",
    ):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError(
                "Rendering requires the optional dependency. Run: "
                "uv sync --extra render && uv run playwright install chromium"
            ) from exc

        self.timeout_ms = int(timeout * 1000)
        self.max_bytes = max_bytes
        self._playwright = sync_playwright().start()
        try:
            self._browser = self._playwright.chromium.launch(headless=True)
            self._context = self._browser.new_context(user_agent=user_agent)
        except Exception:
            self._playwright.stop()
            raise

    def fetch(self, url: str) -> PageSnapshot:
        page = self._context.new_page()
        resource_urls: set[str] = set()
        resource_payloads: dict[str, tuple[str | None, bytes]] = {}

        def record_resource(response) -> None:
            if response.request.resource_type != "image":
                return
            resource_urls.add(response.url)
            try:
                body = response.body()
            except Exception:
                return
            if len(body) <= self.max_bytes:
                resource_payloads[response.url] = (
                    response.headers.get("content-type"),
                    body,
                )

        page.on("response", record_resource)
        try:
            response = page.goto(url, wait_until="domcontentloaded", timeout=self.timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=min(self.timeout_ms, 10_000))
            except Exception:
                pass
            html = page.content()
            if len(html.encode("utf-8")) > self.max_bytes:
                return PageSnapshot(
                    requested_url=url,
                    final_url=page.url,
                    status_code=response.status if response else None,
                    content_type="text/html",
                    html="",
                    title="",
                    text="",
                    error=f"Rendered response exceeded max_bytes={self.max_bytes}",
                    rendered=True,
                    resource_urls=sorted(resource_urls),
                    resource_payloads=resource_payloads,
                )
            return PageSnapshot(
                requested_url=url,
                final_url=page.url,
                status_code=response.status if response else None,
                content_type="text/html",
                html=html,
                title=page.title(),
                text=page.locator("body").inner_text(timeout=self.timeout_ms),
                error=None if response is None or response.ok else f"HTTP {response.status}",
                rendered=True,
                resource_urls=sorted(resource_urls),
                resource_payloads=resource_payloads,
            )
        except Exception as exc:
            return PageSnapshot(
                requested_url=url,
                final_url=page.url or url,
                status_code=None,
                content_type=None,
                html="",
                title="",
                text="",
                error=str(exc),
                rendered=True,
                resource_urls=sorted(resource_urls),
                resource_payloads=resource_payloads,
            )
        finally:
            page.close()

    def close(self) -> None:
        self._context.close()
        self._browser.close()
        self._playwright.stop()
