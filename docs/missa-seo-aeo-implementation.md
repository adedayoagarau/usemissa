# Missa public discovery implementation

This document records the public discovery lane added for the SEO/AEO rollout.

## Canonical public surfaces

- `/` — marketing and featured opportunity entry point.
- `/opportunities-preview` — crawlable browse surface. Filtered query URLs are `noindex` and canonicalize to the base browse page.
- `/discover/opportunities/{slug}` — public, source-linked opportunity detail. The authenticated Passport route remains private.
- `/discover/{collection}` — public category hubs for contests, magazines, poetry, grants, residencies, and fellowships.
- `/org/{organizationId}` and `/org/{organizationId}/{openCallId}` — published organization and Workspace call pages.
- `/guides` and `/guides/{slug}` — answer-led, source-first guides backed by the same published opportunity repository.
- `/robots.txt` and `/sitemap.xml` — crawler policy and bounded dynamic public URL inventory.

## Public answer contract

Every public opportunity page should keep these facts visible in HTML when they exist:

- title and organization;
- deadline, fee, location, and source status;
- eligibility and required materials;
- official source URL;
- freshness or confirmation language;
- a clear next step that does not imply Missa guarantees acceptance.

JSON-LD is generated only for facts also rendered in the page. The implementation uses `WebPage`, `CollectionPage`, `ItemList`, `Organization`, `SoftwareApplication`, `FAQPage`, and `BreadcrumbList` where those entities are visibly supported.

## Evidence and privacy boundary

Anonymous reads use the public repository projection. Personal fit reasons, tracking, submissions, drafts, private profile information, review operations, and submission redirects remain session-gated. Anonymous analytics accepts only page views and `public.*` events; private event names are rejected.

Approved opportunity content remains fail-closed through the repository’s review-status gate. A guide or listing is not an authority: applicants are told to confirm the official source before acting.

## Measurement

The first-party event ledger now receives:

- `public.discovery_view`;
- `public.opportunity_view`;
- `public.collection_view`;
- `public.guides_view`;
- `public.guide_view`;
- anonymous `page_view` events on public paths.

PostHog receives the same public discovery events when configured. The durable analytics view should later add prompt/citation imports from Search Console, Bing Webmaster AI Performance, and controlled ChatGPT/Perplexity query samples; those external systems are measurement inputs, not runtime dependencies.

## Release gates

Before production promotion:

1. Verify Vercel Root Directory is `apps/web`, not the separate `landing` deployment.
2. Confirm `NEXT_PUBLIC_APP_URL` resolves to the intended canonical host.
3. Run the production build and the public crawl E2E tests.
4. Check anonymous `GET /api/opportunities/{slug}` and `/discover/opportunities/{slug}` return public facts without a login redirect.
5. Check `/robots.txt` allows `/discover/`, `/guides/`, and `/opportunities-preview` while disallowing private routes.
6. Check `/sitemap.xml` contains only published public records and no legacy private `/opportunities/{id}` URLs.
7. Confirm source freshness and content-review workers are healthy before increasing distribution.

The collection and public-detail improvements are intended for the production Missa deployment. Re-run the release gates above after each data-model or public-route change.
