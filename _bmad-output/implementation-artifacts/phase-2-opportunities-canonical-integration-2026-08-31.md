# Phase 2 — Canonical Opportunities integration

Date: 2026-08-31

Branch: `codex/phase-0-opportunities`

Status: Complete locally; not deployed

## Outcome

The Phase 1 disclosure system now powers canonical `/opportunities` and `/opportunities/[id]` behind a server-owned presentation selector. Both the legacy and disclosure compositions receive the same already-fetched repository projection, so presentation rollback cannot switch data authority or issue a second repository read.

ADR-003 and ADR-004 are accepted. Production repository selection now fails closed unless Postgres is explicitly configured. Local and test environments retain an explicit compatibility mode.

No Vercel build, deployment, production flag, database migration, or provider mutation was performed.

## Canonical behavior retained

- URL-owned search, taxonomy, location, fee, deadline, sort, cursor, and pagination state;
- bounded public API contracts and customer-safe source attribution;
- canonical metadata, breadcrumb JSON-LD, and opportunity JSON-LD;
- publication-status checks and signed-in access behavior;
- real Save-to-Tracker, Follow, preparation checklist, issue report, related profile, official source, and application actions;
- explicit unknown, conflict, closed, and source-boundary language.

## Rollback contract

`MISSA_OPPORTUNITIES_PRESENTATION` accepts `legacy` or `disclosure-v2`. An explicit value wins. The default is `legacy` in production and `disclosure-v2` outside production. This selector is evaluated on the server after the repository projection is fetched and is deliberately absent from repository selection.

`MISSA_OPPORTUNITY_REPOSITORY=postgres` requires `DATABASE_URL`. Production without that explicit Postgres mode throws `OpportunityRepositoryUnavailableError`; no fixture or in-memory substitute is used. Browse and detail APIs return bounded JSON 503 responses with `no-store`, while pages render a customer-safe unavailable state.

## Verification evidence

The disclosure presentation passed 22 focused Playwright tests. They cover presentation/authority separation, production fail-closed configuration, API-to-page projection equivalence, bounded public source fields, metadata/JSON-LD, anonymous and authenticated Save-to-Tracker behavior, URL/filter/search state, mobile filters, crawl boundaries, and five responsive accessibility widths.

The legacy presentation passed the 13 canonical browse, detail, Save, URL-state, API, and crawl tests under the explicit rollback selector.

Focused lint passes with zero warnings. The web TypeScript check passes after building its declared internal workspace dependencies. No Next.js or Vercel production build was run.

Direct fail-closed checks confirmed:

- browse API: HTTP 503 with bounded JSON;
- detail API: HTTP 503 with bounded JSON;
- browse page: HTTP 200 safe unavailable state;
- detail page: HTTP 200 safe unavailable state;
- neither page displayed fixtures or stale substitutes.

The reproducible audit captured canonical browse and detail at 390, 428, 768, 1280, and 1440 widths. All ten renders returned HTTP 200, had no horizontal overflow, had zero serious/critical Axe violations, retained two JSON-LD blocks on detail, and emitted no browser console errors or hydration warnings.

Evidence: `_bmad-output/planning-artifacts/phase-2/opportunities-canonical/`

Run locally with:

```bash
node scripts/phase-2-opportunities-audit.mjs
```

## Visual inspection

The 390px and 1440px browse/detail captures were inspected. Mobile uses a single-column decision scan with full-width private/application/source actions. Desktop preserves the catalogue refinement rail, two-column cards, prominent opportunity identity, and a sticky-width key-fact rail beside the progressive reading column. Long content, fallback identities, source URLs, unknown facts, and action rows remain contained.

## Component retirement

The explicit keep/deprecate/remove decisions are recorded in `docs/opportunities-component-retirement.md`. Legacy card and detail compositions remain only for bounded rollback observation and are Phase 3 removal candidates. The deterministic design-system fixture remains an edge-state reference, never a runtime data fallback.

## Validation boundary

This is a local implementation and browser verification result. It is not evidence of a Vercel build, preview, production deployment, live Postgres connectivity, or production rollout. Phase 3 should observe the disclosure presentation against production-authoritative data before removing the rollback path.
