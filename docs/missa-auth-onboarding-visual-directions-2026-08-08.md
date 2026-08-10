---
title: Missa authentication and onboarding visual directions
version: "1.0"
status: journey-aware-selection-local-only
date: "2026-08-08"
screen_contract: ./missa-auth-onboarding-contract-2026-08-08.md
review_route: /design-system/auth-onboarding-directions
selected_review_route: /design-system/auth-onboarding
product_promotion_status: blocked
---

# Missa authentication and onboarding visual directions

All directions preserve the interrupted task, use the same password-only current-state boundary, keep unsupported recovery and verification visibly marked as contract targets, and use progressive private onboarding rather than a product tour or exhaustive taxonomy form.

## 01 — Task return — selected for authentication and recovery

The interrupted task leads. Credentials stay compact and the exact safe destination is named before submit.

Strengths:

- fastest return for a creator opening an Opportunity or application;
- makes malformed/unsafe redirects and expired sessions understandable;
- minimizes marketing content around a high-consequence form.

Risks:

- gives less room to explain Profile and Organization context;
- ordinary signup may feel abrupt without careful supporting copy.

## 02 — Quiet split

A restrained product explanation balances a focused credential or onboarding form.

Strengths:

- strongest visual continuity with a premium editorial public site;
- gives privacy and destination consequences room without turning into a tour;
- adapts well across login, signup, and short onboarding forms.

Risks:

- the supporting panel must follow the form on mobile;
- generic story copy could overpower return context if not kept journey-specific.

## 03 — Guided continuity — selected for onboarding

Entry, account, context, and next task remain visible as one recoverable journey. A wide-screen rail names the steps; mobile preserves the same form-first order without the rail.

Strengths:

- strongest for partial Profile and Organization onboarding;
- makes save/resume, role/scope review, and the next destination visible;
- supports invite and reviewer journeys without exposing tenant identifiers.

Risks:

- too much structure for an ordinary returning login;
- step state must never become completion gamification.

## Shared state coverage

- login: ordinary, Opportunity return, application return, invalid credentials, unsafe return, rate limit, expired session, and ambiguous timeout;
- signup: open, invite-only, existing account, invalid email, weak/mismatched password, pending, ambiguous, and unavailable;
- Profile onboarding: broad/no/many practices, alias resolution, deprecated term, preference conflict, offline, concurrent change, resume, and no current matches;
- Organization onboarding: new owner, valid/expired/revoked/already accepted invite, possible duplicate, domain mismatch, reviewer invite/removed assignment, and role-limited landing;
- recovery and verification target states, each clearly labelled as unconnected contract work;
- 12 independent creative-practice facets and 1,084 terms remain progressively searchable, never a flat required list;
- Opportunity type and constraints remain separate from practice; identity, location, and eligibility remain private by default;
- 390px and 1280px full matrix checks, focused 320px form order, keyboard/focus, field association, and WCAG A/AA scans.

## Premium anatomy boundary

Premium form, password, alert, checkbox, radio, autocomplete, invitation, and step anatomy may be adapted. Social providers, recovery links, OTP, verification, SSO, MFA, invite mutation, and onboarding save are not shown as working product behavior until their contracts and APIs exist.

## Selection decision

The selected local system follows the journey rather than forcing one auth template everywhere:

- **Task return** is selected for login, signup, recovery, and verification. The exact safe destination and one credential/recovery task lead.
- **Guided continuity** is selected for Profile and Organization onboarding, where partial save, private context, role/scope review, and the next destination must remain recoverable across several sections.
- **Quiet split** remains reference-only. Its editorial balance is useful, but supporting story copy should not outrank interrupted-task context or add a second narrative to progressive onboarding.

All alternatives remain at `/design-system/auth-onboarding-directions`; the selected journey-aware system is at `/design-system/auth-onboarding`. Open-signup policy, safe-return hardening, recovery/verification/rate-limit policy, typed invite exchange, partial-save/versioned onboarding APIs, privacy defaults, analytics boundaries, and explicit promotion approval remain gates.
