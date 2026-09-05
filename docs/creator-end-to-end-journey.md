# Creator end-to-end journey audit

September 4, 2026. Source inspection, not a completed authenticated end-to-end test. Existing test files are coverage candidates, not evidence of a passing run today. Scope includes the whole creator experience, not just the public portfolio.

## Intended journey

Visit → browse opportunities/directory/collections → inspect an opportunity → save → authenticate if needed → resume original action → optional private preferences → return to saved opportunities → prepare work → apply externally or through a supported hosted call → track progress and outcomes → return for deadlines and new opportunities.

A parallel, optional visibility journey branches from the account: Public profile → identity and practices → selected works/media/links → books/publication credits → contact and appearance → private preview → claim handle → confirm publish → share public URL → edit and republish or unpublish. A portfolio must not be required to browse or save.

## Stage map

| Stage | Creator needs | Current source evidence | Acceptance gate |
| --- | --- | --- | --- |
| Discover | Understand Missa and find relevant opportunities | Public browse, detail, collection and organization routes exist | Mobile entry, filters, pagination, back-navigation and empty/error states |
| Join/sign in | Keep the task they came to do | Signup/login use safe return paths; first-save intent/resume exists | New account, existing account, expired session, duplicate email, password recovery, interrupted signup |
| Get oriented | Choose goals/practices without a long compulsory form | Default auth destination is Opportunities; onboarding and recommendation APIs exist without a customer UI caller found | Optional, resumable preferences; skip; interdisciplinary selection; clear destination |
| Save | Keep a private shortlist | /saved loads tracked saved/interested entries; first-save routes exist | Anonymous save survives auth exactly once; reload and second-device persistence; remove save |
| Prepare/apply | Know requirements and application destination | Detail, library, hosted-submission and tracker routes exist | External apply does not falsely mark submitted; hosted flow tested separately; uploads/errors |
| Track/return | Record progress and see next actions | /tracker, /calendar and /inbox exist; /home redirects to Opportunities | Status transitions persist; deadline/time-zone behavior; notification preferences and actual delivery separately verified |
| Build visibility | Edit a portfolio at their own pace | /profile/portfolio is authenticated, section-based editor | Draft restore, autosave errors/conflicts, multi-work editing, media and organization links |
| Publish/share | Understand what becomes public | Handle APIs, published snapshot and /@handle route exist | Claim conflict, preview, explicit publish, anonymous public access, private draft isolation |
| Maintain | Update safely and control visibility | Republish, rename and unpublish paths exist | Old snapshot remains while editing; aliases; media revocation; second-device editing |
| Manage account | Recover access and control personal information | /profile contains identity/preferences/privacy/integrations/data sections | Recovery, logout, export/deletion and distinction between private preferences and public content |

## Concrete gaps found

1. No customer UI consumer of `/api/me/profile/onboarding` or `/api/recommendations/feed` was found. The design-system onboarding route is not the real onboarding journey.
2. `safeAuthRedirect` does not allow `/saved`, although `/saved` redirects signed-out people to `/login?next=/saved`. That return path falls back to Opportunities.
3. Account settings expose “Preview public Profile” at `/profile/<userId>`, but that route only resolves a published portfolio. A creator with an unpublished draft can reach a dead end instead of private preview.
4. Account identity edits use `/api/me/profile`, while portfolio identity lives in its draft. Define their relationship explicitly and test updates; do not assume synchronization.
5. No forgot-password/reset entry was found in `auth-form.tsx`. Provider capability alone does not make recovery discoverable.
6. No single verified real-account sequence currently establishes signup → save → reload → portfolio → publish → anonymous view → edit → unpublish across devices. Prior portfolio checks included mocked account transport and isolated database tests.

## Recommended implementation and QA order

1. Repair entry/auth return paths, recovery and account-to-private-preview navigation.
2. Connect optional creator orientation/preferences, preserving the original save/task and allowing skip/resume.
3. Prove opportunity → save → saved → prepare/apply → tracker with a dedicated test account and isolated test data.
4. Prove account → portfolio → media → handle → publication → anonymous URL → republish/unpublish, including stale-device conflicts.
5. Verify return use: calendar, inbox, notification preferences, account management; distinguish UI state from delivered reminders.
6. Run mobile and desktop, keyboard, slow/failing network, expired-session and cross-device checks. Only then move to the organization journey.

## Source pointers

- `apps/web/components/auth-form.tsx`, `apps/web/lib/authRedirect.ts`, `apps/web/app/api/journey/first-save/`.
- `apps/web/app/(passport)/saved/page.tsx`, `apps/web/app/(passport)/tracker/page.tsx`, `apps/web/app/(passport)/home/page.tsx`.
- `apps/web/app/profile/page.tsx`, `apps/web/components/profile-product.tsx`, `apps/web/app/profile/[userId]/page.tsx`.
- [Portfolio integration endpoints and boundaries](directory-portfolio-integration-handoff.md).
- Candidate tests: `apps/web/e2e/auth.spec.ts`, `first-save-focused-handoff.spec.ts`, `library.spec.ts`, `submissions.spec.ts`, `calendar-product.spec.ts`, and `creator-portfolio-*.spec.ts`.

## Delivery checklist — creator workspace programme

User approved closing the creator journey before organization work. This is the execution backlog; unchecked items are not complete.

- [x] Preserve /saved through authentication (redirect allowlist and regression assertions).
- [x] Send account-profile actions to the authenticated portfolio editor instead of an unpublished public URL. Existing Link/Button styling is retained; this is navigation, not a new component variant.
- [ ] Complete password recovery, expired-session recovery and authentication error states.
- [ ] Connect optional, resumable orientation to private preferences; preserve first-save intent.
- [ ] Clarify account identity versus public portfolio identity and privacy controls.
- [ ] Verify one complete authenticated save and portfolio publication journey using isolated test data.
- [ ] Build a coherent creator workspace entry: next actions, upcoming deadlines, saved opportunities, active applications and return-to-draft shortcuts. /home currently redirects; do not duplicate Tracker data.
- [ ] Review Library/work preparation, application tracking, outcomes and portfolio reuse without assuming private files are public.
- [ ] Refine the existing calendar: month/agenda, time zones, exact versus estimated dates, rolling/unknown deadlines, reminder setup, accessible mobile navigation and calendar export/subscription controls.
- [ ] Integrate existing notification preferences: in-app and email, event categories, digest cadence, opt-out, time-zone handling and clear channel availability. Additional channels require actual provider support and consent.
- [ ] Verify event → preference evaluation → scheduled job → delivery attempt → provider receipt/failure; deduplicate, retry safely, record bounces and suppress unsubscribed recipients.
- [ ] Design previewable email templates: welcome, account recovery, deadline reminder, saved-search digest and relevant application updates, with meaningful subjects, text alternatives, mobile layout and appropriate preference links.
- [ ] Verify inbox read/unread states, deep links and notification-to-task continuity.
- [ ] Audit account export/deletion, media removal, inaccessible links, empty accounts, slow/offline behavior and accessibility.
- [ ] Final acceptance: desktop/mobile, keyboard, reload, second device, session expiry, save conflicts, unpublished privacy and unpublish behavior. A rendered email is not proof of delivery.

Existing implementation to build on: `calendar-workspace.tsx`, `notification-preferences-panel.tsx`, `/api/me/notification-preferences`, and `packages/radar-adapters/src/creatorNotificationRepository.ts`. Existing calendar documentation contains older route assumptions; reconcile against current implementation before using it as a status report.

No outbound email or notification is authorized merely by this implementation backlog; use isolated fixtures/previews for QA unless a specific test recipient is approved.
