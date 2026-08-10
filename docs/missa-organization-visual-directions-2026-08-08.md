---
title: Missa Organization chooser and overview visual directions
version: "1.0"
status: option-01-selected-local-only
date: "2026-08-08"
screen_contract: ./missa-organization-chooser-overview-contract-2026-08-08.md
review_route: /design-system/organization-directions
selected_direction: 01-context-rail
selected_review_route: /design-system/organization
product_promotion_status: blocked
---

# Missa Organization visual directions

The three directions below use the same chooser, role projections, attention priority, lifecycle summaries, active Opportunity rows, customer language, and 25 edge fixtures. None changes `/workspace`, any Organization API, authorization, billing, or production.

## 01 — Context rail — selected

A persistent Organization rail keeps the current Organization, role, and authorized destinations visible while the overview remains consequence-first.

Strengths:

- strongest desktop orientation and returning-operator scanning;
- clearest place for the Organization switcher and role-aware routes;
- future submissions, reviews, decisions, people, and settings pages inherit one stable shell;
- compact without turning the overview into a metric dashboard;
- mobile converts the rail into an explicit switcher plus horizontally scrollable destination index.

Risks:

- narrow desktop widths leave less room for split panes;
- the horizontal mobile destination index needs a visible scroll affordance and current-item positioning;
- role-specific navigation must come from server capabilities, not a client-side role list.

## 02 — Operations ledger

An editorial Organization context header and horizontal destination index put the operation into one wide reading plane.

Strengths:

- strongest wide-table and long-name accommodation;
- calm, recognizably Missa, and less dashboard-like than a conventional admin sidebar;
- current Organization, current product, and search are easy to scan together on desktop;
- works well when most operators move deeply within one Program or Opportunity.

Risks:

- ten destinations create horizontal pressure even before contextual call navigation is added;
- Organization identity and navigation consume more vertical space on mobile;
- the mobile implementation initially hid the Organization switcher because a broad rule hid both direct buttons; QA narrowed that rule and verified the switcher is visible again;
- returning operators may need more orientation time than with a stable left rail.

## 03 — Attention desk

A persistent Organization rail pairs a consequence-first task index with the current lifecycle and Opportunity context.

Strengths:

- strongest high-pressure overview for owner/admin and Program manager roles;
- keeps an attention reason beside the operation it affects;
- scales well to large attention queues on wide desktop;
- prevents summary cards from outranking consequential work.

Risks:

- visually heavier and easier to mistake for the pattern every Organization page should use;
- duplicates attention structure when the next destination is itself a queue;
- requires careful single-scroll ownership and should collapse to the same linear mobile order as Context Rail;
- not suitable for Reviewer or Finance modes when their authorized scope is naturally smaller.

## Shared chooser contract represented

- zero, one, and several memberships;
- pending invitation with explicit Organization and intended role;
- unavailable Organization without permitting entry;
- search and no-result recovery for larger membership lists;
- create and ask-to-join paths without hiding existing memberships;
- interrupted switch retains the prior Organization and states that no new tenant data loaded;
- foreign access reveals no Organization detail;
- no tenant ID, `Workspace`, queue, provider, confidence, freshness, or compatibility language.

## Shared overview contract represented

- owner, Reviewer, Program manager, Finance, and Viewer modes;
- role-aware navigation and omitted unauthorized controls;
- one useful next action only when the role may act;
- consequence-first attention rows with exact destination language;
- lifecycle summaries that omit inaccessible information rather than showing misleading zeroes;
- active Opportunities and Programs as a compact table with labelled-row mobile fallback;
- no-Opportunity empty state that keeps practice taxonomy, eligibility, geography, dates, fees, and form sections separate;
- practice-rule conflict, triage, overdue review, mixed per-Work decision, message failure, delivery, billing/seat, unavailable projection, large queue, long-name, and urgent-mobile fixtures;
- command search with a visible trigger, no-result recovery, Escape, and a normal navigation equivalent;
- polite mutation/status announcements.

## Runtime QA evidence

- Each direction rendered one H1 and one named Organization navigation at 1280px.
- Document scroll width equalled client width in all three directions at 1280px and 390px.
- The 390px chooser rendered four memberships, role labels, search, enter actions, and no horizontal overflow.
- Reviewer mode retained Reviews and removed People and Settings.
- Unavailable overview rendered no lifecycle counts.
- The taxonomy-conflict fixture stated that eligibility and form questions were unaffected.
- The no-membership and foreign-access fixtures rendered no `Workspace`, `Submission Path`, tenant ID, or private Organization detail.
- Command no-result behavior was corrected to reset its fixture query on each dialog opening.
- Direction 2's hidden mobile Organization switcher was found and corrected during visual QA.
- Browser runtime logged no errors after the final pass.
- Targeted ESLint, TypeScript, and `git diff --check` pass.

## Selection criteria

The selected direction should:

1. preserve Organization and role context more strongly than it displays metrics;
2. scale from a new Organization to high-volume operational queues;
3. allow the ten-role capability projection to simplify navigation rather than create dead controls;
4. remain usable for urgent tasks on mobile while optimizing frequent administration for desktop;
5. provide a stable shell for Opportunities, Submissions, Reviews, Decisions, Messages, Delivery, Insights, People, and Settings;
6. avoid turning every future Organization route into the overview's special layout;
7. keep premium anatomy subordinate to the Missa contract.

Product promotion remains blocked on typed capability projections, chooser/invitation/suspension contracts, tenant-state invalidation, exact role-scoped overview queries, URL-backed target routes, authenticated integration, complete assistive-technology QA, and explicit approval.

## Selection decision

Option 01, Context rail, is selected as the local Organization chooser and overview foundation. It preserves Organization identity, role, and authorized destinations more reliably than the horizontal ledger, while avoiding Attention Desk's temptation to make a special overview layout the template for every operational page. On mobile, the rail becomes an explicit Organization switcher followed by a scrollable destination index and a single linear content path. All three alternatives remain available at `/design-system/organization-directions`; the selected-only route is `/design-system/organization`.
