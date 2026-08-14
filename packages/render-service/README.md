# Missa render service

A bounded headless-browser escalation for ingestion v2. Static fetching handles
most pages; this service exists for the ones it cannot read — organization sites
that ship an empty application shell, and interstitials that only resolve after
JavaScript runs.

It is deliberately a separate Railway service. Chromium's memory cost is
isolated here, the ingestion worker image stays small, and rendering scales on
its own axis.

## Contract

```http
POST /render
Authorization: Bearer $RENDER_SERVICE_TOKEN
{"url": "https://www.casanailha.org/the-multidisciplinary-residency-program/"}
```

Returns `{ url, finalUrl, statusCode, contentType, html, rendered }`.
`GET /health` reports liveness and current in-flight count.

## Safety

A renderer that fetches any URL on request is an SSRF proxy. Before a browser
opens, `assessRenderUrl` rejects non-HTTP(S) schemes, embedded credentials,
loopback and link-local addresses, RFC1918 and carrier-grade NAT ranges, IPv6
unique-local and link-local, and cloud metadata hostnames. The bearer token is
required at start-up — the service refuses to boot without one.

Images, media, and fonts are aborted at the route level. They cost time and
bytes and never carry the text extraction reads.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `RENDER_SERVICE_TOKEN` | yes | Shared secret; the service will not start without it |
| `PORT` | no | Defaults to 8080 |
| `RENDER_CONCURRENCY` | no | In-flight renders, default 2, capped at 8 |
| `RENDER_TIMEOUT_MS` | no | Navigation budget, default 20000 |

Callers set `RENDER_SERVICE_URL` and the same `RENDER_SERVICE_TOKEN`. With
neither set, ingestion runs static-only exactly as before.

## Cost posture

Rendering is roughly two orders of magnitude more expensive than a static fetch,
so `shouldRender` in `@missa/ingestion-v2` treats it as an escalation, never a
default: a page qualifies only when it declares that JavaScript is required, is
an empty app shell, carries almost no visible text, or looks like a challenge
and yielded no fields. A render failure returns the static document — coverage
degrades, runs do not fail.
