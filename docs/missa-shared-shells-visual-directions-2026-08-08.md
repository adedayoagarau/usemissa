---
title: Missa shared shell visual directions
version: "1.0"
status: option-02-selected-local-composition
date: "2026-08-08"
screen_contract: ./missa-shared-shells-contract-2026-08-08.md
review_route: /design-system/shell-directions
selected_review_route: /design-system/shell
product_promotion_status: blocked
---

# Missa shared shell visual directions

## Selection

**Option 02 — Product switcher is selected.** The selected-only review route is `/design-system/shell`; the three-direction comparison remains at `/design-system/shell-directions`. This is a local design-library decision only. Product shells, routes, authorization, analytics, and redirects remain unchanged until explicit promotion approval.

All three directions use the same canonical product language, route hierarchy, people, capabilities, and edge fixtures. They are structural comparisons, not palette themes. Premium navigation, dropdown, Sheet, avatar, command, breadcrumb, scroll-area, and workspace patterns supply anatomy only.

## 01 — Editorial masthead

A calm horizontal identity leads public and Profile pages. Organization, reviewer, and Platform Admin add a grouped task rail when their density requires it.

Strengths:

- strongest continuity with Missa’s editorial public character;
- direct scanning for the three primary Profile destinations;
- operational rails remain consequence-first without forcing public pages into an app shell.

Risks:

- product switching can become secondary if the current context is not explicit;
- the horizontal Profile bar must resist accumulating aliases and utilities again.

## 02 — Product switcher

Profile and Organization are explicit contexts above a compact task navigation. Reviewer and Platform Admin remain focused products rather than additional tabs in the customer switcher.

Strengths:

- clearest solution for people who create and also operate one or more Organizations;
- reduces hidden Organization access and keeps product context visible;
- supports a stable compact header on mobile.

Risks:

- the switcher can look like ordinary tabs unless identity and route consequences are clear;
- Organization switching needs a separate, unmistakable tenant control.

## 03 — Context rail

A slim signed-in product rail and adjacent contextual navigation keep dense work stable. Public pages retain an editorial header rather than inheriting the rail.

Strengths:

- strongest persistent context for Organization and Admin work;
- leaves horizontal space for long route groups and nested destinations;
- can separate product switching from within-product navigation.

Risks:

- consumes valuable width in Profile and reviewer journeys;
- requires a careful tablet/mobile transformation and may feel heavier than creator tasks justify.

## Shared fixtures

- signed out and session expired;
- creator with no, one, and several Organizations;
- role-limited and removed Organization membership;
- unavailable destination without global navigation collapse;
- long identity and Organization names;
- mixed RTL and Latin labels;
- Public, Profile, Organization, reviewer, and Platform Admin shells;
- 320, 390, 768, 1280, and 1536px widths;
- mobile menu open/close/navigation focus and current-route semantics.

Option 02 is selected locally. Product shells, routes, authorization, analytics, and redirects remain unchanged.
