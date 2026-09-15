# Missa WebMCP surface contract

Missa progressively exposes browser-native tools through the current WebMCP
Community Group draft. The integration is optional: browsers without
`document.modelContext` continue to receive the normal product without an
error or a polyfill.

## Surface inventory

| Surface                                                          | Tools in this slice                                                                                           | Deliberately excluded                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Public discovery                                                 | Surface context, opportunity search/detail, magazine and residency rankings, public creator profile/portfolio | Saving, opening an official destination, applying, inferring eligibility, or reading an unpublished portfolio     |
| Creator workspace                                                | Public tools plus bounded application summaries                                                               | Notes, saved answers, files, material contents, status mutation, or submission                                    |
| Organization workspace                                           | Public tools plus open-call metadata and redacted submission summaries                                        | Submitter identity, answers, files, reviewer identity, work titles, publication, decisions, messaging, or exports |
| Reviewer workspace                                               | Public tools plus reviewer-scoped assignment summaries                                                        | Work contents, scoring, recommendations, recusal, or review submission                                            |
| Auth, admin, claims, settings/billing, and receipt/detail routes | None; `Permissions-Policy: tools=()`                                                                          | Every WebMCP capability                                                                                           |

All tool registrations:

- are same-origin and tied to the current document/route with an
  `AbortSignal`;
- are read-only, non-consequential, and marked as containing untrusted output;
- use bounded input schemas and bounded response projections;
- return `authority_effect: "none"`, `mutation_available: false`, and
  `provider_confirmation: false`;
- never treat a catalogue result, external link, personal tracking status, or
  organization workflow record as provider confirmation.

Ranking tools include the 2026 beta methodology path and the API's live source
state (`database`, `seed`, or `empty`). Rank and score remain comparison aids,
not endorsement, creator fit, eligibility, acceptance likelihood, or
certification of current terms.

The public creator tool accepts an `@handle` or public user ID and returns the
current public profile plus the published portfolio projection. Work text is
opt-in and bounded. Portfolio drafts, settings, Library, Tracker, applications,
and unpublished files are never part of the response.

## Browser and verification boundary

WebMCP is a Community Group draft, not a W3C Standard. Current Chromium builds
may require the WebMCP testing flag and a compatible browser agent. Unit and
Playwright tests can verify Missa's registrations and handlers with a local
`document.modelContext` test double, but that is not proof that a user's browser
or agent exposes native WebMCP. Native availability must be checked separately
in the target browser profile.
