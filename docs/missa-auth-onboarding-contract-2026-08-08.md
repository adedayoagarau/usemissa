---
title: Missa authentication and onboarding contract
version: "1.0"
status: journey-aware-selection-local-composition-product-promotion-blocked
date: "2026-08-08"
routes: /login, /signup, /onboarding/profile, /onboarding/organization
product_promotion_status: blocked
---

# Missa authentication and onboarding contract

## 1. Purpose

Authentication should return a person safely to the task they chose. Onboarding should collect only enough context to make the next decision useful.

The journey must distinguish:

- creating a personal Profile;
- joining or creating an Organization;
- accepting a reviewer assignment;
- returning to an existing account;
- recovering account access;
- entering through a public Opportunity, hosted application, Organization invite, reviewer invite, or ordinary Home/signup path.

It must not force exhaustive taxonomy entry, Organization setup, or a product tour before the person can resume their intended task.

## 2. Current implementation truth

Repository inspection on 8 August 2026 found:

- `/login` and `/signup` use one password-based `AuthForm` and a same-origin `safeAuthRedirect` helper;
- successful signup immediately creates an account, signs the person in, and redirects to the safe destination;
- signed-in visits to login/signup redirect to `/opportunities` rather than honoring a still-valid intended task;
- client and server enforce basic name/password/email shape, but errors render as one form-level message rather than field-associated errors;
- there is no account-intent step, Profile onboarding, Organization onboarding, email verification flow, password recovery, SSO, MFA, invite-specific auth projection, or visible terms/consent acknowledgement in this journey;
- no auth-specific request rate-limit, lockout, challenge, or recovery policy is visible in the route code;
- server error copy may reveal engine-level distinctions unless normalized deliberately;
- the visual story panel makes marketing claims but does not preserve or explain the interrupted task;
- public browse links still point to `/opportunities-preview` rather than the canonical Opportunity family.

The local design can represent target states, but unsupported controls must be labelled as future contract targets and never wired to nonexistent APIs.

## 3. Entry intents

| Entry | First successful destination | Continuity required |
| --- | --- | --- |
| Public Opportunity | Same canonical Opportunity and originating query/section | Opportunity ID/slug, query, selected result, safe return |
| Start hosted application | Exact application readiness step after authentication | Organization, call, draft intent; no draft created before deliberate start |
| Save/track Opportunity | Same Opportunity with the requested action resumed or clearly requested again | Avoid duplicate mutation; explain whether action completed |
| Ordinary Create account | Short intent choice, then useful Opportunities or Profile onboarding | No exhaustive profile gate |
| Organization invite | Invited Organization and role-allowed landing page | Invite token exchange, expiry, existing-account match, safe failure |
| Reviewer invite | Exact assignment or assigned queue | Blind projection, assignment authorization, removed/expired state |
| Existing account login | Interrupted task or last explicit safe destination | Never silently divert to an unrelated dashboard |
| Expired session | Same legal destination after reauthentication | Preserve unsaved local draft where safe; server state revalidated |

## 4. Route model

### `/login`

One job: **Return to your task.**

- persistent email and password labels;
- show/hide password with an accessible changing name;
- safe return context in plain language when present, such as “Log in to continue your application to …”;
- recovery action only when a working recovery contract exists;
- alternate authentication only when configured and available;
- link to signup with the exact safe return preserved;
- do not embed a product tour in the form.

### `/signup`

One job: **Create the minimum safe account.**

- display name, email, password, confirmation, terms/privacy acknowledgement when required;
- explain the exact post-signup destination;
- existing-account recovery path;
- invite-aware copy and hidden validated invite exchange rather than user-editable tenant IDs;
- no full taxonomy, portfolio upload, Organization settings, or payment request.

### Target `/onboarding/profile`

One job: **Give Missa enough private context for more useful Opportunities.**

Progressive sections:

1. broad practices and roles;
2. languages and location context;
3. Opportunity interests and constraints;
4. review and privacy explanation;
5. useful browse results with later refinement.

Every section can save and continue later. Skip is visible where the field is optional. Completion is not gamified with a percentage.

### Target `/onboarding/organization`

One job: **Enter the correct Organization context and next task.**

- invitees review Organization, inviter, role, scope, and expiry before acceptance;
- new owners create a minimal Organization identity, then choose whether to create the first Opportunity now or return later;
- existing Organizations are matched cautiously by invite/domain evidence without exposing private tenant data;
- duplicate Organization and domain mismatch require review rather than silent merging;
- membership, role, seat, and billing are separate facts.

## 5. Authentication and security contract

- normalize email consistently and enforce bounded input lengths on client and server;
- login failure copy does not reveal whether an email exists;
- signup may explain an existing account only through a safe recovery path and abuse-resistant policy;
- auth endpoints have rate limiting, progressive delay/challenge policy, audit events, and non-secret operational telemetry before broad promotion;
- session cookie remains HttpOnly, Secure in production, SameSite-aware, bounded, and rotated according to a documented policy;
- `next` accepts only normalized same-origin application paths; reject protocol-relative, encoded external, control-character, backslash, and disallowed operational destinations for ordinary users;
- invite tokens are single-purpose, time-bound, auditable, and exchanged server-side;
- password reset and email verification tokens are time-bound, single-use, and do not create a session before the policy allows;
- Platform Admin, Organization administration, and reviewer assignment authorization are checked after authentication; a valid account is not sufficient authority;
- no password, token, secret, or provider error is retained in analytics or rendered back to the user.

## 6. Taxonomy and preference onboarding

The canonical creative taxonomy has 12 independent facets and 1,084 selectable terms. Onboarding must not show a flat list or ask the person to finish the graph.

- start with a few broad practice-family and role choices, then allow search/refinement by facet;
- store canonical IDs, not display labels;
- aliases help search but save the canonical term;
- multi-parent terms preserve their identity and can be found through more than one path;
- “show more,” “especially interested,” and “do not show” remain preference states, not taxonomy edges;
- opportunity type, identity eligibility, career stage, geography, fee, and deadline remain separate questions;
- location and identity attributes are private by default and never inferred from practice or language;
- no match becomes “Missa has no matching records in the current collection,” not “there are no Opportunities”;
- deprecated, missing, or culturally sensitive terms remain reviewable and do not silently block account completion;
- onboarding never declares a person eligible or evaluates artistic quality.

## 7. Account and intent states

All local directions must exercise:

- ordinary login, ordinary signup, and mode switch with return preserved;
- invalid email, short password, mismatch, existing account, invalid credentials, server error, timeout, and rate limit;
- pending submit, duplicate click, ambiguous response, success, and response after navigation;
- open signup, invite-only signup, and access/waitlist policy;
- unverified email, expired verification, resend limit, changed email, and provider outage;
- forgot-password request, unknown email safe response, expired/used token, weak new password, and success;
- safe, missing, malformed, encoded-external, Admin, Organization, reviewer, and application return paths;
- creator intent, Organization intent, both, and “decide later”;
- no practice selected, many practices, alias match, no matching label, deprecated term, and preference conflict;
- Organization invite valid/expired/revoked/already accepted, duplicate Organization, domain mismatch, and role-limited landing;
- reviewer assignment valid/removed/closed and multiple Organizations;
- session expiry during onboarding, offline save, partial completion, concurrent change, and resume on another device;
- 320, 390, 768, 1280, and 1536px, plus keyboard, screen reader, zoom/reflow, reduced motion, and high contrast.

## 8. Form, error, and recovery behavior

- each field has a persistent label, optional/required state, description only when useful, and associated error;
- long forms have an error summary that links/focuses the first invalid field;
- user input remains after recoverable failure;
- pending disables duplicate submission without disabling reading or navigation;
- password reveal preserves the value, selection, accessible name, and focus;
- success is a route/result state, not only a disappearing toast;
- ambiguous server outcome does not invite an immediate duplicate account or invite acceptance;
- Back never destroys a completed onboarding section without warning;
- browser autofill and password managers work through correct names and autocomplete values;
- errors use direct language and never generic “Something went wrong” when a safe recovery is known.

## 9. Privacy, consent, and communication

- account creation links to current Terms and Privacy and records consent only when policy requires it;
- marketing email consent is separate, optional, and off by default unless law/policy explicitly permits otherwise;
- transactional verification, invite, security, and recovery messages are distinct from marketing;
- private matching inputs and eligibility attributes are explained before collection and default private;
- Organization invite acceptance states the Organization, role, scope, seat implication if relevant, and who will see the member;
- public Profile publication is a later explicit choice, never implied by account creation;
- exported/deleted account consequences require separate Profile/Data contracts.

## 10. Accessibility and responsive contract

- the form is the first logical mobile task; supporting story content follows or is omitted;
- touch controls are at least 44px;
- the page has one clear heading matching the task and one primary submit action;
- status and errors are announced without moving focus unexpectedly;
- focus moves to the first invalid field after summary activation and to the next page heading after success;
- password requirements are visible before error and do not rely on color;
- no CAPTCHA or challenge is inaccessible; an alternative path is documented;
- invite and return-context copy wraps without pushing the form below the first useful viewport;
- motion is optional and never delays login or account creation.

## 11. Component and promotion gates

Premium form, password, OTP, alert, stepper, radio, autocomplete, dialog, and Sheet references may supply anatomy only. Reject candidates that add social-login buttons for unavailable providers, require a carousel/product tour, gamify Profile completion, flatten taxonomy, hide terms, use placeholder-only labels, or treat a generic success animation as a durable result.

Before promotion:

- open-signup versus waitlist/invite policy is approved;
- account recovery, verification, rate limiting, and normalized error policy exist or the UI truthfully omits those actions;
- safe return-path parser and route allowlist are hardened and tested;
- invite contracts for Organization and reviewer journeys are typed;
- Profile and Organization onboarding APIs, partial-save/version behavior, and privacy defaults exist;
- analytics exclude credentials/tokens/private taxonomy values;
- all entry/return paths and state fixtures pass desktop/mobile/keyboard/screen-reader/zoom/high-contrast QA;
- explicit page-family approval is recorded.

Product promotion remains blocked.
