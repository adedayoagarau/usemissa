---
title: Missa opportunity journey Phase 0 audit
status: captured-baseline
captured: "2026-08-08"
scope: Signed-out and disposable authenticated opportunity browse, detail, save/track, and Tracker handoff
viewports: 1440x1000, 390x844
component_selection: none
---

# Missa opportunity journey Phase 0 audit

## Verdict

The current public journey has a calm visual base, safe unknown-state language, working URL-backed browse controls, and a clear official-source action. It is not ready to become the overhaul foundation without structural changes.

The largest problems are product problems rather than styling problems:

1. operational freshness is rendered as customer content;
2. weak source records receive the same visual authority as trustworthy opportunities;
3. the mobile filter wall delays the first result and the empty state;
4. the public and signed-in journey is duplicated across route families;
5. the detail page omits the source-provided image visible on the card;
6. the visible `Filter` button clears filters instead of opening a filter experience.

No premium component has been selected or evaluated in this audit.

## Capture and evidence limits

- Current local app at `http://127.0.0.1:3000`.
- Existing local Chrome used headlessly because no in-app automation surface or Playwright-managed browser binary was available.
- Signed-out public route: `/opportunities-preview` and its first public detail result.
- Authenticated route: `/opportunities`, mobile detail sheet, and `/tracker` using the deliberately disposable in-memory demo world on a separate local port.
- `DATABASE_URL`, the configured opportunity repository, and client analytics key were explicitly blanked for authenticated capture; no shared account or opportunity state was mutated.
- Current local repository data, not a claim about production data quality.
- Automated axe checks were run on browse/detail at both viewports and reported no violations.
- Screenshots and axe cannot prove keyboard, screen-reader, voice-control, cognitive-accessibility, or production-performance compliance.
- Profile editing, external submission, Organization, reviewer, and Admin flows remain outside this capture.

## Step 1 — Public browse, desktop

Health: **Partial**

![Public opportunities desktop viewport](../outputs/missa-overhaul-phase-0-2026-08-08/05-public-opportunities-desktop-viewport.png)

### What works

- Public shell makes Opportunities and account entry visible.
- Search, categories, taxonomy, location, fee, deadline, open state, total, sort, and result list are present.
- Cards support a source image or neutral initials fallback.
- Unknown organization and fee states are not silently converted into facts.
- URL-backed controls and result count establish a usable behavior contract to preserve.

### Problems

- `Fresh source only` exposes an internal operational concept the user has explicitly rejected.
- Every card renders “Recently checked” or “Check is aging.” This is backend state, not a customer decision.
- The first record title—“Open Call - Online Application - today to August 8”—reads like scraped source text, not a reviewed opportunity title.
- “Organization not confirmed” repeats across most of the first grid, weakening confidence in the inventory.
- Cards carry type, urgency, title, organization, practice labels, location, freshness, deadline, deadline-relative time, fee, prize/source prompt, primary action, and save. The decisive facts do not have enough hierarchy.
- Secondary text frequently uses 10–11px sizing.
- The `Filter` button does not open a panel; its handler clears all filters. Its label and behavior disagree.

## Step 2 — Public browse, mobile

Health: **Needs structural redesign**

![Public opportunities mobile viewport](../outputs/missa-overhaul-phase-0-2026-08-08/06-public-opportunities-mobile-viewport.png)

### Measured behavior

- Viewport: 390×844.
- First result begins at y=750; only 94px is visible in the first viewport.
- Six selects and three toggles are rendered before results.
- No page-level horizontal overflow was detected (`scrollWidth = clientWidth = 390`).

### Problems

- Filters, disabled dependent controls, and toggles consume the decision-making viewport before the user sees a complete opportunity.
- Genre and Style appear disabled before a Discipline is chosen, increasing visual load without giving immediate value.
- The category strip is horizontally clipped without a strong scroll affordance.
- The mobile header removes the public navigation without replacing it with an accessible menu.
- The visible Filter control is only 36px high, below the 44px customer-mobile target.
- The first opportunity title is the first proof of inventory and is low quality.

### Target correction

- Show result count, sort, and a meaningful part of the first result in the first viewport.
- Keep search visible.
- Replace the six-select wall with a compact Filters action and active-filter summary.
- Put dependent and advanced taxonomy controls inside the filter experience.
- Remove freshness controls entirely.

## Step 3 — Public opportunity detail, desktop

Health: **Partial**

![Public opportunity detail desktop viewport](../outputs/missa-overhaul-phase-0-2026-08-08/07-public-opportunity-detail-desktop-viewport.png)

### What works

- Back path, title, Organization state, summary, decisive facts, preparation, official source, and account CTA form a clear reading order.
- Unknown fee, location, and materials remain explicit.
- Official source is close to the warning and application decision.
- Desktop layout is calm and does not overfill the screen.

### Problems

- `Evidence` mixes organization confirmation with “Recently checked · Checked 1 day ago.” Operational state must not be rendered.
- The low-quality extracted title becomes an oversized headline, amplifying the record-quality failure.
- The card's source image disappears from detail, despite the requirement that useful source-provided imagery remain available without a photo label.
- The page is too sparse when structured opportunity content is unavailable, yet repeats the weak extracted title in the generated summary.
- The account CTA promises to compare the call with the user's work before the public page has demonstrated enough trustworthy detail.

## Step 4 — Public opportunity detail, mobile

Health: **Partial**

![Public opportunity detail mobile viewport](../outputs/missa-overhaul-phase-0-2026-08-08/08-public-opportunity-detail-mobile-viewport.png)

### Problems

- The title and repeated summary occupy most of the first viewport before useful requirements or action.
- Operational freshness is prominent in the first fact group.
- The back link measured 19px high and the official-source link 20px high; their interactive area needs a 44px touch-safe treatment.
- The account CTA is correctly 44px high but appears after a long low-information record.
- No image or compact visual identity helps the user confirm that this is the same opportunity selected from the card.

## Step 5 — Empty search, mobile

Health: **Needs structural redesign**

![Public opportunities empty state mobile viewport](../outputs/missa-overhaul-phase-0-2026-08-08/09-public-opportunities-empty-mobile-viewport.png)

### Problems

- The same filter wall is rendered before the empty state, so the reason and recovery action begin below the first viewport.
- Result count and sort remain visually paired even when there are zero results.
- The recovery experience should prioritize the query, active filters, and a clear reset—not make the person scan disabled controls first.

## Highest-impact requirements

### P0 — Keep backend freshness out of customer UI

Remove customer `verifiedOnly`, `recently-verified`, `Fresh source only`, `Recently checked`, `Check is aging`, check timestamps, and source-age messaging. Keep official source access. Preserve all operational source health in Platform Admin.

### P0 — Add a publication-quality gate

An opportunity should not receive normal browse/detail authority when its title is a source fragment, its Organization is unconfirmed, or its identity is too weak to support a consequential decision. Quarantine, review, or de-emphasize it rather than asking visual design to disguise bad data.

### P1 — Rebuild mobile browse around results

Search and one compact filter action precede results. Active filters appear as removable summaries. Full taxonomy, location, fee, deadline, and opportunity-type controls live in a dedicated mobile filter flow. The first meaningful result must begin substantially above y=750.

### P1 — Establish one canonical public/signed-in journey

Use `/opportunities` and `/opportunities/[slug]` for both states. Authentication enhances the page with private match reasons and save/track/apply actions; it does not switch to a duplicate layout.

### P1 — Preserve useful imagery consistently

If the browse result has a useful source-provided image, the detail page should preserve it as visual context. Render it directly without adding a visible media heading or caption. If it is decorative, use empty alt text; if it identifies the opportunity or Organization, use meaningful alt text. Use a quiet fallback when absent.

### P1 — Reduce card decision load

Prioritize title, Organization, deadline, fee, and location/eligibility reach. Keep one clear entry action. Move secondary taxonomy, prize details, preparation, and source explanation to detail.

### P1 — Remove the false Save vs. Track choice

Current `Save` and `Track` controls call the same endpoint and both create the same Tracker item with `myStatus: saved`. They are one product action presented twice. Use one clear entry action—**Save** or **Save to Tracker**—then let Tracker statuses express whether the person is merely saving, preparing, submitting, or waiting.

### P2 — Repair mobile navigation and touch targets

Provide an accessible public menu and 44px touch areas for back, source, filter, save, and other consequential links.

## Behavior to preserve

- URL-backed query and canonical taxonomy IDs.
- Category, query, location, fee, deadline, open-state, and sort behavior where the product decision retains them.
- Dependent taxonomy relationships, moved behind progressive disclosure.
- Result count and clear active-filter state.
- Exact unknown language for fee, deadline, location, Organization, and requirements.
- Optional source imagery and neutral fallback.
- Official-source link.
- Safe login/signup return path.
- Signed-in private match reasons, save, track, and application handoff once captured and verified.
- No horizontal page overflow at 390px.

## Accessibility evidence

Automated axe result: zero reported violations on browse/detail at 1440×1000 and 390×844.

Manual risks still requiring correction or testing:

- 10–11px card text;
- 19–20px-high text-link targets on mobile detail;
- 36px Filter action on mobile;
- horizontally clipped category navigation;
- keyboard order through six selects and three toggles before results;
- screen-reader announcement behavior during URL-driven result refresh;
- focus restoration after filtering and returning from detail;
- image alt semantics for source identity vs. decorative imagery.

## Step 6 — Login and return continuity, mobile

Health: **Working behavior to preserve**

![Authenticated login return mobile](../outputs/missa-overhaul-phase-0-2026-08-08/10-authenticated-login-return-mobile.png)

- Login presents one clear task and uses 44px fields/actions.
- The encoded return path was preserved exactly: login returned to `/opportunities?openNow=1&selected=none`.
- The mobile story panel pushes the form down but remains understandable; the overhaul should evaluate whether this much acquisition copy belongs in a returning-user flow.

## Step 7 — Authenticated browse, mobile

Health: **Partial**

![Authenticated opportunities mobile](../outputs/missa-overhaul-phase-0-2026-08-08/11-authenticated-opportunities-mobile.png)

- The authenticated shell adds a compact navigation trigger and identity menu.
- Private preference reasons appear only after authentication, which is correct.
- The same mobile filter wall and public freshness controls remain.
- Save search adds another control before results.
- The first demo result begins near the bottom of the first viewport.

## Step 8 — Authenticated detail sheet, mobile

Health: **Strong structural pattern with content corrections required**

![Authenticated opportunity detail sheet mobile](../outputs/missa-overhaul-phase-0-2026-08-08/12-authenticated-opportunity-detail-sheet-mobile.png)

- The detail sheet fills the 390×844 viewport exactly and keeps browse context behind it.
- Image, title, Organization, decisive facts, requirements, reasons, and application action form a usable focused flow.
- “Why this may fit” uses observable preference intersections instead of predicting quality or acceptance.
- Freshness still appears in the identity block and must be removed.
- Match reasons repeat the saved-search name and raw matching explanation; they need shorter human wording.
- The full-screen sheet must restore focus and scroll position when closed.

Automated axe reported no violations in this captured sheet state.

## Step 9 — Save/track and Tracker handoff, mobile

Health: **Functionally connected, conceptually duplicated**

![Tracked opportunity state mobile](../outputs/missa-overhaul-phase-0-2026-08-08/13-authenticated-opportunity-tracked-mobile.png)

![Tracker handoff mobile](../outputs/missa-overhaul-phase-0-2026-08-08/14-authenticated-tracker-mobile.png)

- Authentication, mutation, refreshed card state, and Tracker handoff work in the disposable world.
- `Track` and the bookmark `Save opportunity` action both call `/api/users/[id]/track`.
- Both actions create a Tracker row with `myStatus: saved`; saving a second card increased Tracker to two planning items.
- The card then shows `Tracked`, `Apply`, and an additional list control, creating a crowded action row.
- Tracker confirms the saved opportunities and supports Pipeline, Calendar, Works, Types, Organizations, and List views.
- Tracker renders “Strong Fit” as a compact score-like label; the redesign should foreground concrete reasons instead.
- The mobile Tracker header competes with Import and calendar actions before the status summary.
- Automated axe found two critical `button-name` violations: Base UI combobox triggers for Work assignment had no discernible accessible name.

## Phase 0 status

Public browse, detail, empty state, login return, authenticated browse, authenticated detail sheet, save/track mutation, and Tracker handoff are captured and accepted. Profile editing, hosted/external submission, Organization, reviewer, and Admin flows remain pending and must not be claimed as audited.
