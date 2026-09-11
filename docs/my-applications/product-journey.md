# My applications in the Missa product

September 7, 2026. This extends and corrects scope-and-design.md. Decisions below are proposed product behavior; current-state observations identify implementation gaps. The local preview illustrates the page shell, labels and local lifecycle. It does not implement the cross-product save/auth migration.

## Page job and user mental model

“I found something worth keeping. Where is it, what do I need to do, and what happened?” My applications is the private record of an opportunity from intention through outcome. It is not another opportunity directory, an application form, or a copy of the publisher profile. A save is an intention to revisit, not a claim that an application exists at the publisher.

Saved is the first view inside My applications. A creator does not need to invent an application, enter its known metadata, or commit to applying before saving. Discovery remains public. Personal work, notes and outcomes remain private.

## What currently conflicts

| Evidence in current code | Product consequence | Proposed resolution |
| --- | --- | --- |
| CreatorShell has Opportunities, Saved, Tracker, Library, Inbox, Profile; public MissaSiteHeader has Opportunities, Directory, Rankings, Tracker, Library | People encounter different menus and duplicate-looking destinations | Keep the existing private sidebar/mobile Sheet, align destinations/order, consolidate Saved under My applications |
| `/saved` reads the same canonical tracked records as `/tracker`, filtered to saved/interested | Saved is a view, not another storage model | Preserve `/saved` as an alias to `/tracker?view=saved`; migrate links without deleting records |
| SaveOpportunityButton and SaveToTrackerButton both POST `/api/me/tracker`; one refreshes, the other navigates to `/tracker` | The same bookmark behaves differently | One shared Save command/state; stay on source page, announce success and offer View application |
| Legacy `/my-submissions` redirects to `/tracker?view=submissions` | Existing deep links must survive | Map old view parameters to new views, preserving hosted submission detail routes |
| Public browse already knows `item.personal?.tracked`, but SaveOpportunityButton starts false | A returning creator can see misleading unsaved state | Hydrate canonical account saved state on all surfaces; idempotent duplicate save remains safe |
| MagazineTrackerAction saves an open opportunity ID, otherwise links to magazine open calls | Journal and application identity are properly distinct | Keep this rule; magazine save/follow must not manufacture a submission |
| Google callback sends newly created accounts to `/onboarding` instead of their `next` path | A held save must survive first-time setup | Preserve signed first-save intent across optional onboarding and finish/skip; resume intended save exactly once |
| Canonical tracked list applies public opportunity visibility predicate | Private history may disappear when a public entry is unpublished | Retain account-owned snapshots and unavailable detail states; never erase private history based on public visibility |

## Navigation: yes to the existing sidebar

Desktop: reuse CreatorShell’s left rail. Mobile/tablet: reuse its logo/header and Sheet menu. Do not add a second sidebar for application stages or a competing top menu. Repeated destinations keep the same relative order across public and private navigation.

Public discovery: Opportunities → Directory → Rankings. Signed-in entry: My applications, with Library/account tools reachable. Private rail: Opportunities → Directory → Rankings → My applications → Library → Calendar → Inbox → Profile. Organization/admin destinations remain conditional and separate. Only expose operational tools that are available for the user’s rollout. The prototype links to existing routes; it does not certify those features for beta.

Inside My applications: Saved / Awaiting responses / History are the sole primary tabs. Search is scoped to the selected view. Import and Add from elsewhere are supporting actions. The logo returns to Opportunities in the private workspace, matching the existing CreatorShell. The current tab is highlighted; main content has a skip target.

Naming: the existing naming document says Tracker. This proposal deliberately makes “My applications” the user-facing name because that is the user’s requested section. `/tracker`, existing saved records and APIs stay stable. Rename Save feedback, navigation, accessibility labels and email links together in the production change; never silently alternate Tracker/My Tracker/My applications. Until implementation the preview shows the proposed label; live navigation remains unchanged.

## The ways in

| Entry | What happens | Arrival state |
| --- | --- | --- |
| Signed-in Save on opportunity card/detail | Save same account + call once, preserve search and scroll | Stay browsing. Confirmation: “Saved to My applications” with View application |
| View application in save confirmation | Open stable deep link | `/tracker?view=saved&application=<id>` with that item selected |
| First-time visitor presses Save | Hold signed call/return intent, sign in/up, optional onboarding if incomplete, revalidate call, complete one save | Return to discovery context with confirmation; offer View application. Expired/changed/closed call needs explicit recovery |
| Existing saved bookmark | Show Saved; selecting its navigation action opens existing item | Correct current stage, even if already submitted; do not create another Saved copy |
| My applications in navigation | Restore last view if useful; otherwise Saved | List, counts, no arbitrary auto-selected detail |
| Magazine ranking / journal profile | Choose actual open call; save that call through same command | Same behavior as opportunity save; multiple calls require a choice |
| Add from elsewhere | Minimal title, organizer, original submission URL; deadline/type/work optional | New private Saved item, marked Added by you, detail selected |
| Import | Existing preview, column mapping and review before commit | Show imported items filtered by import receipt, with Clear import filter |
| Hosted Missa submission | Confirmed server receipt joins existing saved record when IDs match | Awaiting responses; mark source Submitted through Missa; preserve authoritative receipt |
| Calendar/Inbox/reminder link | Resolve application ID after auth, validate ownership | Exact item and relevant date/update, not generic homepage |
| Library work | “View related applications” filters matching linked work IDs | Does not create an application from a work alone |

No Save is triggered merely by viewing a page, opening Apply, following a journal, or completing onboarding. Anonymous returning save needs the same first-save continuation across Google and email auth. Closing auth cancels navigation but must not show Saved. Account switches cannot consume someone else’s intent.

## Single-page interaction sequence

1. Arrive: recognizable creator menu, My applications heading, lifecycle tabs and search. Empty first-use view explains that saving from Opportunities adds items here; primary Browse opportunities and quiet Add from elsewhere / Import. No sample tiles in a real empty account.
2. Scan: organization identity + title + type + one stage-specific label + relevant date. Sort Saved by actionable future deadlines, rolling/unknown afterwards, closed last. Awaiting prioritizes due personal check-ins then submission age. History sorts recorded outcomes.
3. Select: row title opens detail on the same page. At wide widths show list and detail; at narrower widths replace list with detail and Back to applications. Preserve tab/query/filter/scroll/selection. URL carries selected application for refresh and deep links. Browser Back closes detail before leaving the page; direct-entry Back returns to the list.
4. Decide: detail shows one authoritative opportunity summary, original deadline, optional fee, current availability, selected work and next action. “View opportunity” opens the existing canonical detail; organization opens its existing profile. Never replicate the complete journal biography, rankings methodology or submission guide here.
5. Apply: open official destination in a new tab with accessible new-tab indication, keep Missa context available. No automatic submitted status. On return, a quiet “Did you submit?” prompt can offer Record submission / Not yet / Dismiss; never block the page or recur every focus event. Provider destinations must be authorized from the publisher’s own application route.
6. Record: I submitted → date confirmation → transactional status/event update → Awaiting responses, selected record stays visible, success with Undo. Cancel retains prior state. Future actual-event dates invalid. Changes from another session show conflict and preserve draft.
7. Wait: submitted date, intermediate state if present, evidence-backed estimate only if available, personal check-in option otherwise. Reminder configuration is separate from entering a date. Updating notes or linking work never advances stage.
8. Resolve: Record update/outcome. In review, shortlisted, waitlisted and revision requested remain Awaiting. Accepted, declined, withdrawn become History. For partial multi-work outcomes, retain active work in Awaiting; show “1 of 3 accepted” only when known. Never imply all works were accepted.
9. Correct: edit recorded date/status or Undo; record correction events and reconcile scheduled reminders. Explicit creator notes cannot overwrite hosted authoritative evidence. Reapplication to a later call is a new attempt; restoring an archived item is not reapplying.
10. Leave: global navigation, View opportunity, organizer profile, linked Library work, Calendar, or original Apply. Persist confirmed state before departure; unsaved forms require Save/Discard/Stay if leaving would lose work. Failed saves do not vanish or claim success.

## Tile/row anatomy and labels

Use one compact application row/card, not the full discovery image card. Carry the same organizer identity/logo when available, original title and type. Show neutral fallback initials for missing identity rather than broken imagery. The prototype uses fictional organization names and no invented logos.

| Information | Saved | Awaiting responses | History |
| --- | --- | --- | --- |
| Title + organizer | Always | Always | Always |
| Type pill | Grant / Residency / Magazine / etc., same source labels as discovery | Same | Same |
| Second pill, at most one | Closing soon / Closed / Deadline changed, when verified; omit redundant Saved | Submitted / In review / Shortlisted etc. | Accepted / Declined / Withdrawn / Archived |
| Main date | Apply by [date], Rolling or Deadline not listed | Submitted [date] | Outcome [date]; Archived date if known |
| Supporting metadata | Optional target date or linked work | Check in [date] or supported estimate | Optional linked work |
| Provenance | Added by you / Imported only when relevant | Submitted through Missa or recorded by you in detail | Source of recorded outcome in detail |

Priority for Saved secondary label: unavailable/closed → material deadline change → closing soon. Max two pills total, including type. Dates are plain text with a calendar icon if helpful. Submission state and opportunity availability are separate fields: “Closed” never means “Declined.” Declined/withdrawn/archive stay neutral, accepted may use green, deadlines amber, red for actual error/destructive action. No tier score, fee-free award, social links, match score, ranking movement, or long editorial description on each application tile. Those remain in their existing details.

Advanced custom tags are deferred: type + stage + work already support core retrieval. Do not introduce a taxonomy the user must maintain before it helps.

## Visual carryover audit

Rendered the current local Opportunities page at 1440px and inspected both current shell components. The first prototype shares white/Forest tokens and UI controls but its large serif headline and custom two-link navigation do not match the compact current opportunity header or the existing creator shell. Revised preview therefore uses the actual CreatorShell with proposed preview-only navigation and a compact interface heading.

Carry over: wordmark/BetaBadge; global destinations; primary/outline/quiet button hierarchy; existing search input; category pill shape and meaningful color semantics; organizer identity; original titles; deadline formatting; calm borders; touch sizes; mobile menu; focus/error feedback. Use existing Dialog/Sheet, never a custom overlay.

Adapt: discovery’s large images become compact identity/context in application rows. “View opportunity” becomes “View application” on the private row; Apply remains official external navigation. Replace discovery filters with personal lifecycle views. Strip irrelevant discovery persuasion and broad public footer content from the private workspace. Keep list density responsive rather than cloning either a large marketing card or a dense desktop table.

This follows [consistent navigation guidance](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) and [consistency and standards](https://www.nngroup.com/articles/consistency-and-standards/). The specific sidebar choice comes from Missa’s existing private shell, not a generic dashboard rule.

## Product contracts between pages

- Opportunity repository owns public facts/destination; application record owns personal state/dates/notes; Library owns work/assets; organization profile owns biography; ranking service owns scores. Join by IDs rather than copy editable versions of every field.
- Save command is idempotent and account-scoped. Every surface reads the same saved/current status; local optimistic state rolls back on error. Preserve source return URL and only allow internal safe redirects.
- Auth success is not save success. The held intent must be completed/revalidated separately, once, across optional onboarding. Resume must cover account binding, expired intent and changed deadlines.
- Status, actual dates and correction history commit atomically; outbox drives calendar/reminder reconciliation. There is no inference of submission from external navigation.
- Import and hosted records reconcile with canonical items; safe deduplication retains divergent notes/attempt history and offers review. Public deletions preserve private application history with a snapshot and an unavailable marker.
- Personal check-in and target dates are distinct from official deadlines. A saved date is not a delivered notification. Known provider setup, time zones, successful sync and cancellation must be verified before enabling delivery claims.
- Return links from emails/calendar/work detail target stable owned IDs; expired sessions route through login and back. Unauthorized IDs show a bounded not-found state, no account information.

## Release backlog from this audit

1. Product naming/navigation migration: one My applications destination; `/saved` and legacy parameters preserved as aliases. Preview-only changes are not this migration.
2. Unify Save components and saved state hydration; stay in discovery with View application; shared mobile/desktop/auth behavior. Existing Save API reused.
3. Prove first-save continuation across Google/email + optional onboarding, including expired/changed-call/account-switch cases. Existing resume route reused.
4. Canonical application projection: stable deep link, actual dates, outcome provenance, work links, persisted notes, hosted/import deduplication, invisible-public-item retention.
5. Connect the revised list/detail to that projection with view/search/selection URL state, navigation return and full lifecycle/undo.
6. Link Calendar, Library and Inbox with application identity. Turn on reminders only after real delivery/reconciliation tests.

## End-to-end acceptance before replacing live Tracker

- Save on card, detail and ranking produces one shared record and consistent Saved feedback without forcing navigation.
- Guest save → Google/email → optional onboarding complete/skip → resumed save preserves call and source context; reload does not duplicate.
- Navigation entry, toast entry, deep link, calendar entry and Library-filter entry land at the appropriate view/item.
- First use, many records, empty tabs, no results, closed/removed call, loading, offline mutation and concurrent conflict remain navigable.
- Apply leaves status unchanged; explicit confirmation and correction persist across reload/devices. Cancel/back/escape never record a submission.
- Returning from detail or publisher preserves filters/scroll; sidebar/mobile menu and browser Back behave consistently.
- Hosted receipt and imported record do not create conflicting application copies; private history survives public withdrawal.
- Required labels reflect real source fields; unknown values are not replaced with reassuring estimates.
- Calendar/reminder lifecycle tested with provider read-back and actual delivery/cancellation, not only visible controls.

## Preview coverage boundary

The revision demonstrates actual shared shell, mobile menu, stage/type labels, detail and supporting navigation, and the previously tested sample lifecycle. Cross-page Save/auth/storage behavior, link restoration, hosted merges and provider delivery are fully scoped here but remain implementation work. No production save or account data was changed in this design pass.
