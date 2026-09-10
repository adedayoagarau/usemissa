# My applications design verification

September 7, 2026. Local preview at `http://localhost:3100/design-system/applications-v2`; current LAN address verified as `10.0.0.119`. All records are fictional and all prototype mutations are in memory. The live account tracker was not replaced.

## Requirements and evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Scope based on existing work | Read live tracker route, TrackerProduct, canonicalTracker projection, September 5 direction and inventory | Account-backed foundation retained; contract gaps identified in scope |
| Information architecture and responsive design | scope-and-design.md; preview Saved / Awaiting responses / History | Delivered as proposal |
| Save-once, direct-apply truth | Scope forbids inferred submission; fictional Apply button disabled; confirmation test | Designed; live endpoint integration remains production P0 |
| Submission and outcome flow | E2E confirmation/retry/outcome/undo scenario | Pass |
| Error/pending/retry | Preview error control; pending submit disabled; first save fails, fields retained, retry succeeds | Pass |
| Supporting flows | Manual title/organization; optional original URL; multiline note; archive/restore; date correction; check-in | Implemented in preview; main supporting flows tested |
| Loading, empty, no results | Skeleton control, empty-account control and search test | Pass |
| Keyboard and focus | Arrow-key tabs, Escape closes dialog, returns focus to invoking action | Pass |
| 390px mobile and long content | Mobile test opens long fellowship title; no document overflow; screenshot inspected | Pass |
| Reduced motion | Browser reduced-motion preference enabled during mobile test; no authored motion | Pass |
| 200% zoom/reflow | Chromium CSS zoom 2 at 1280px; 640px reflow plus 200% root text size; no overflow | Pass; native browser zoom and physical-device testing not performed |
| Accessibility | axe scan on mobile detail, zero serious/critical violations | Pass; not a full assistive-technology certification |
| Token/component policy | Registered composition; installed Button/Tabs/Dialog/Field/Input/Textarea/NativeSelect/Empty/Alert/Skeleton, original domain layout | No new primitive or vendor theme |
| Static checks | Web TypeScript no-emit, design-system check, git diff --check | Pass |
| Production data/reminders | Prototype contains no account API mutation and sends no notifications | Explicitly out of design-prototype scope |

## Reproducible checks

From apps/web:

```
PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test e2e/applications-design-preview.spec.ts --reporter=line
```

All five browser tests passed together on the final preview. Source/type checks passed after the final component changes.

From repository root:

```
npx tsc --noEmit --pretty false --project apps/web/tsconfig.json
npm run check:design-system
git diff --check
```

Screenshots (apps/web/outputs): applications-v2-desktop.png, applications-v2-mobile.png, applications-v2-zoom.png. These were viewed during the review. The mobile search was expanded to its own row; inactive tab content was removed to avoid duplicate accessible panels.

## Build handoff

Begin with canonical date/event/provenance contracts and unified hosted/imported/tracked reads, then replace the live presentation after account-isolated persistence and reload tests. Keep existing import/library/calendar paths available. Implement response estimates and reminder/calendar reconciliation only with evidence-backed data and verified delivery. This design completion is not beta-launch certification or a claim that those integration stages are complete.

Local console boundary: the shared site analytics POST to `/api/analytics/events` returned 403 during anonymous preview review. The sample application interactions do not call this endpoint. No application-preview runtime exception was observed; analytics permissions were not changed as part of this design work.

## Product journey revision

Reused CreatorShell through an opt-in applicationsPreview variant: default account navigation unchanged. Desktop sidebar, mobile Sheet menu, active destination and Library exit tested. ApplicationLabels wraps installed Badge outline/secondary variants with no custom color or motion; at most type plus one state. The compact interface heading follows current Opportunities hierarchy. Detailed cross-product evidence and proposed contracts are in product-journey.md.

Six browser scenarios pass after fixing back-button wrapping at high zoom. Desktop and 390px screenshots reviewed; mobile detail axe has no serious/critical violations. Design-system check passes. Project-wide TypeScript check is blocked by three existing errors in components/missa/homepage-next-opening.tsx (callProfile/content access); no errors reported in the changed application files. Cross-page persistence, authentication continuation and browser history restoration are scoped, not demonstrated by this fixture preview. No deployment performed.
