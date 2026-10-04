# Creator onboarding — design preview

Review route: /design-system/creator-onboarding. Component: apps/web/components/creator-onboarding-preview.tsx.

Two optional questions: creative practices (multiple), opportunity interests (multiple). Back preserves selections, skip proceeds without required input, and review permits editing. The final actions lead to real browse and the existing portfolio design preview. No artificial loading, account-save claims, recommendation counts or publishing are simulated. Choices currently live in React state and reset on reload.

Intent: selection uses installed ui/Checkbox, actions use ui/Button, navigation uses Link with existing buttonVariants. Existing semantic Tailwind tokens only; no registry install or new primitive variant. Mobile stacks the editorial panel and form; keyboard-native checkbox controls and focus transfer to each step heading are included. Selection status is announced. Production loading/error/success states remain pending authenticated persistence.

Production journey: finish the action that brought the creator to signup first, then offer optional personalization. Do not interrupt first-save resume. Keep broad private interests distinct from public portfolio labels. Detailed genres, geographic eligibility and notification consent can be requested in context later. Do not infer eligibility from practice selection. API taxonomy mapping and resumable account persistence must be verified before cutover. The current onboarding API uses engine persistence and should be reconciled with relational preferences before connecting this preview.

Design reference: https://www.nngroup.com/articles/mobile-app-onboarding/ — brief optional onboarding and contextual learning. Existing auth-onboarding directions remain available; this preview does not replace production signup.

## Editorial refinement

Mobbin reference reviewed visually: Skillshare Selecting topics, https://mobbin.com/flows/8c3afc1a-303c-4d1f-b459-06455fe6267a. Adapted its clear topic-card selection pattern, without its mandatory selection count or matching animation. Nextdoor interest selection was also inspected: https://mobbin.com/flows/3300eaaf-c006-45e8-ba32-3ea21700b80b.

Uses the existing Missa wordmark, Newsreader heading token, forest primary surface and owned portfolio-still-life media. Icon cards include descriptions, checkbox state, hover border and focus ring; no generated images required. The decorative editorial panel is omitted on smaller screens to keep questions first. Back/selection preservation and skip were exercised at 390px, with no horizontal overflow; reduced-motion mode was exercised. Desktop screenshot inspected. Full screen-reader and native-phone verification remain pending. Account integration is unchanged.

## Image-led choice revision

Supersedes the editorial side-panel composition: six generated discipline images now form the selectable cards in a centered three-column desktop/two-column mobile grid. Asset: public/media/onboarding-practices.png, generated specifically for this preview; rendered as a six-cell CSS sprite without modifying the source. Labels sit on solid surfaces for contrast. Selection reveals optional practice-specific checkboxes, preserves choices on Back, and includes active refinements in the review. Opportunity interests use existing local editorial media. Still a local-state design preview, not canonical taxonomy/account persistence.

Validation: TypeScript and design policy passed; 390px overflow check passed; Writing → Poetry → Continue → Back preserved selection. Desktop rendered cards visually inspected.

## Split editorial redesign (October 2026)

Supersedes the single-column composition. Desktop is a split layout: the question column on the left, and on the right a sticky campaign image with a live private summary ("What Missa will look for"). On the Profile step that summary becomes a Profile preview. Below 1024px the image panel is hidden and the Profile preview appears inline under the fields.

Mobbin references reviewed: Cosmos onboarding (split form and curated imagery), https://mobbin.com/flows/6d86217f-51e7-4277-a871-3015005b118f; Delphi handle claim (inline prefix and availability), https://mobbin.com/screens/e5965ff1-6799-4313-91b5-6396014ff394; Mintlify site naming (inline confirmation of the resulting address), https://mobbin.com/screens/c71f4db8-2732-4072-b005-1c6c1d53508d. We adapted the structure only. Missa tokens, type, and copy are unchanged.

Component intent → policy entry `composition.creator-onboarding`:

- Step navigation: a labelled `<nav>` with an ordered list. Visited steps are real buttons, and the current step carries `aria-current="step"`. Mobile shows a segmented progress bar with a text label.
- Multiple selection: `Checkbox` inside image tiles (practices), thumbnail rows (opportunity interests), and chips (refinements). Each control is named by its title and described by its description.
- Single choice: `RadioGroup` cards for career stage and participation. The fee preference uses `Switch`.
- Long option lists: `Combobox` for country (about 250 options) and time zone (IANA list with UTC offsets, detected from the device).
- Handle: `InputGroup` with an inline `usemissa.com/@` prefix, availability icon, status text, and a "Check again" action when the check fails.
- Feedback: an inline `Alert` for save failures, `FieldError` for each invalid field, and a `Spinner` with `aria-busy` on pending actions.
- Actions: a sticky bottom action bar (safe-area aware) with one primary action, and "Finish later" in the header.

Behaviour fixes shipped with the redesign:

- "Finish later" saves the current choices and marks setup skipped. A skipped setup resumes at its saved step instead of showing the completed summary.
- Editing a completed setup keeps the status `completed`; previously an intermediate save reset it to `in_progress` and cleared `completedAt`.
- Cleared interests, practices, and refinements now persist. Values owned by other surfaces are preserved.
- Deselecting a practice removes its now-hidden refinements, so they are not saved.
- Time zones are chosen from a list and validated by the API. A free-text zone would make deadline formatters throw.
- Errors clear on step change. A 401 response sends the person to log in with `next=/onboarding`.
- Enter submits the current step. Focus moves to the step heading and the page scrolls to the top on each step.
- The Profile preview no longer shows a `/@handle` the account cannot claim.
- Demo mode (no database) now stores interests and location for new accounts and reads location back.

Validation: 1440px desktop, 390px mobile, 320px, and 640px (200% zoom equivalent) with no horizontal overflow; reduced motion (step entrance animations use `motion-reduce:animate-none`); keyboard (Space toggles tiles, Enter submits, Enter in a combobox selects without submitting). These states were exercised: empty, selected, save error, field validation, session expiry, skipped resume, completed edit, and handle claim in the preview. `e2e/beta-onboarding.spec.ts` was updated for "Finish later" and skipped resume.

## Focused layout with live matches (October 2026)

Supersedes the split layout. Each step is one centered question with no side image. Studio photographs (`public/homepage/studio/v1/*-desktop.webp`) appear only on the "What do you make?" choice tiles. A selected tile shows a check badge on the photo as well as the checkbox.

- Live match count: the sticky action bar shows how many open calls fit the choices so far (`MatchCount`, a polite `role="status"` region). It reads `/api/opportunities` through `onboardingMatchParams` (`apps/web/lib/onboardingMatches.ts`), debounced and abortable. Kinds of work widen the set with the new `taxonomyMatch=any` browse option. Without it, terms were ANDed, so choosing more kinds of work lowered the count. A chosen sub-option narrows only its own kind of work. Opportunity types, country eligibility (which includes worldwide calls), and the no-fee preference narrow the set, the same way they do on /opportunities. The count says "open calls", not eligibility, and is hidden when the API fails.
- Location: the time zone detected from the device is shown as one line with a Change action; the Combobox opens only on request or on error. Career stage, participation, and fees sit under "Fine-tune · optional" as compact radio chips and a Switch.
- Address: when handle claiming is open, the last step leads with "Claim your Missa address". It uses a large `InputGroup` with the `usemissa.com/@` prefix, live availability, "Try:" suggestions when the address is taken, and a "Check again" retry. Finishing waits until the address is confirmed available. When claiming is closed or an address already exists, the step is "Confirm your name", and the address can be chosen later in Profile.
- Welcome: shows the three matching calls that close soonest (`MatchList`), "See all N matches" (the same query on /opportunities), Open Tracker, and the editable setup summary.

The handle picker was already wired in production (`HANDLE_CLAIM_ACCESS_MODE` is `open`). It only disappears locally when there is no database, because claiming then reports unavailable.

Validation:

- Unit tests: `apps/web/lib/onboardingMatches.test.ts`, the contracts default shape, and a repository test for `taxonomyMatch=any` across hierarchies.
- Read-only counts against production data (Writing 210, Visual arts 671, either 826, both 55) confirmed that any-mode returns the union.
- Layout: 1440px desktop, and 390px and 320px mobile, with no horizontal overflow on any step. The address field on the last step previously overflowed by 14px at 390px; its grid is now `grid-cols-1`.
- E2E: `e2e/beta-onboarding.spec.ts`, the onboarding test in `e2e/design-remediation-mobile.spec.ts`, and `e2e/auth-onboarding-directions.spec.ts`.
