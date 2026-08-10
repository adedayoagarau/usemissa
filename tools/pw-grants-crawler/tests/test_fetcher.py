import httpx

from pw_grants_crawler.fetcher import HttpFetcher


def test_http_fetcher_returns_html_metadata_and_visible_text():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "text/html; charset=utf-8"},
            text="<html><title>Example</title><body><h1>Hello</h1></body></html>",
            request=request,
        )

    client = httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)
    snapshot = HttpFetcher(client=client).fetch("https://example.test/call")

    assert snapshot.status_code == 200
    assert snapshot.final_url == "https://example.test/call"
    assert snapshot.content_type == "text/html; charset=utf-8"
    assert snapshot.title == "Example"
    assert snapshot.text == "Hello"
    assert "<h1>Hello</h1>" in snapshot.html


def test_http_fetcher_records_empty_binary_responses_as_failures():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "text/plain"},
            content=b"",
            request=request,
        )

    client = httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)
    snapshot = HttpFetcher(client=client).fetch_binary("https://example.test/pixel", max_bytes=100)

    assert snapshot.status_code == 200
    assert snapshot.content == b""
    assert snapshot.error == "Empty response body"


def test_http_fetcher_retries_rate_limits_before_returning_success():
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(
                429,
                headers={"retry-after": "0"},
                text="slow down",
                request=request,
            )
        return httpx.Response(
            200,
            headers={"content-type": "text/html"},
            text="<html><body>ok</body></html>",
            request=request,
        )

    client = httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)
    snapshot = HttpFetcher(client=client, max_retries=1).fetch("https://example.test/profile")

    assert attempts == 2
    assert snapshot.status_code == 200
    assert snapshot.text == "ok"
