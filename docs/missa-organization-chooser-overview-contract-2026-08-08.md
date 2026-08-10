---
title: Missa Organization chooser and overview contract
version: "1.0-draft"
status: option-01-selected-local-composition-product-promotion-blocked
date: "2026-08-08"
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
current_routes:
  - /workspace
target_routes:
  - /organization
  - /organization/[id]/overview
product_promotion_status: blocked
---

# Missa Organization chooser and overview contract

This contract defines the first two authenticated Organization surfaces before any premium component is selected: choosing the Organization context and understanding what needs attention inside that context. The current `/workspace` route is compatibility evidence, not the target composition.

The rendered product name is **Organization**. `Workspace`, `Entity`, `Submission Path`, tenant IDs, queue names, provider state, and compatibility-store language remain internal.

## 1. User objectives

### Organization chooser

The person must be able to answer:

1. Which Organizations can I enter?
2. What is my role in each one?
3. Is any access invitation or account issue waiting for me?
4. How do I create an Organization or ask to join an existing one?
5. Where will Missa take me after I choose?

Success feels like: “I know which Organization I am entering and what I am allowed to do there.”

### Organization overview

The person must be able to answer:

1. Which opportunity, submission, review, decision, message, or delivery work needs attention?
2. What can I personally act on in my current role?
3. Which program and opportunity does each count belong to?
4. What is the safest next action?
5. Can I reach the exact filtered queue without reconstructing context?

Success feels like: “I can see the operation, understand my scope, and start the right task without hunting.”

## 2. People and role modes

Missa currently stores ten Organization roles. The UI must not flatten them into “admin” and “member.” Permissions remain server-authoritative; the overview projection returns only actions and counts the viewer may know.

| Role | Default overview emphasis | Actions that must not appear without authority |
| --- | --- | --- |
| Owner | Whole operation, access, billing, policy, consequential publishing | None inside their Organization, subject to last-owner and policy safeguards |
| Admin | Whole operation, people, programs, calls, queues | Ownership transfer and owner-only policy where applicable |
| Team admin | Team membership and team-scoped operations | Organization-wide billing, ownership, unrelated teams |
| Program manager | Calls, intake, review progress, decisions for assigned programs | Organization billing, unrelated programs, owner access |
| Reviewer | Assigned reviews and their due state | People, billing, full submission inventory, other reviewers’ private notes |
| Finance | Fees, payments, payouts, refunds, exports permitted by policy | Reviews, private applicant material not needed for finance, role administration |
| Legal | Guidelines, policy, consent, disputes, approved document access | Billing changes, reviewer notes, unrelated submissions |
| Viewer | Read-only Organization views explicitly granted | Mutation controls, disabled mutation controls that imply inaccessible data |
| Guest | Narrow invited object or temporary collaboration | Global Organization navigation and unrelated records |
| Member | Compatibility role; show the explicit capabilities returned by the server | Never infer elevated access from the legacy label |

An occasional reviewer should normally enter the focused Reviewer experience, not the full Organization shell. If they also hold an operational role, the product switcher can expose both destinations without merging their permissions.

## 3. Authoritative domain boundaries

| Question | Domain | Chooser/overview treatment |
| --- | --- | --- |
| Which Organization may this account enter? | Organization membership | Server-authorized membership projection only; never infer from a URL |
| What may this person do? | Role and policy capabilities | Render named capabilities/actions, not guessed role hierarchy |
| Which Team owns the Program? | Team → Program | Use `Team` in customer copy; `Entity` stays internal |
| What is being run? | Opportunity/call | Use `Opportunity` for the object and “call” in explanatory copy where natural |
| What describes eligible creative practice? | 12-facet canonical taxonomy | Stable term IDs; rules remain accepted/preferred/required/excluded and separate from eligibility |
| Who may apply? | Eligibility rules | Separate from practice taxonomy, role, geography, fee, and form answers |
| Where may someone apply from? | Geography/reach | Separate rule group; unknown remains unknown |
| What did the applicant send? | Submission → Work | A Submission may contain multiple Works and mixed outcomes |
| What is under review? | Review round and assignment | Review state never doubles as decision state |
| What was decided? | Decision per Work | Overview counts cannot force one outcome onto a multi-Work Submission |
| What follows acceptance? | Delivery task per accepted Work | Completion means marked complete in Missa, not externally delivered unless evidenced |
| What was sent? | Message/audit/outbox projections | State only what Missa can prove; no provider internals or invented delivery certainty |
| What may cross Organization boundaries? | Nothing private | Foreign IDs resolve to not-found/empty without revealing existence |

## 4. Current-state findings that the overhaul must correct

- `/workspace` silently selects the first membership and redirects, so there is no real chooser.
- The current sidebar prints the internal Organization ID to customers.
- The landing page combines seats, billing, Team creation, Program creation, Opportunity creation, publishing, controls, and form building in one long page.
- The shell has no explicit Organization switcher despite preserving `organizationId` in links.
- Navigation is almost identical for every role; owner/admin management and reviewer work are not sufficiently separated.
- “People” is linked to a hash on the landing route even though a dedicated People route exists.
- Current role editing exposes all ten roles as a raw select without explaining consequences, last-owner safety, SCIM ownership, or role scope.
- Billing and people panels disappear while loading rather than showing faithful loading/error/permission states.
- Current overview-like pages expose internal IDs and raw ISO timestamps in customer rows.
- Existing shell tests contain stale “Workspace” expectations and cannot prove the target Organization language or information architecture.
- Organization suspension, pending invitations, scoped capability projections, and durable message-delivery detail are not fully represented by the current public domain model; designs must label these as required contracts, not pretend they already exist.

## 5. Target route and shell contract

### `/organization`

This route is a context chooser, not an empty dashboard.

- Zero memberships: explain that no Organization is connected; offer `Create Organization` and `Ask to join`, with invite acceptance when an invite token exists.
- One membership: show the Organization and role clearly. The page may continue automatically only after announcing the destination and preserving a direct way back to the chooser.
- Multiple memberships: searchable Organization list ordered by recent user choice, then name; never by internal ID or inferred importance.
- Suspended/unavailable Organization: keep it visible with a plain reason and recovery path, but do not allow entry.
- Pending invitation: distinguish `Accept invitation` from existing membership; show inviter and intended role only when safe and available.
- Create/join are secondary to entering an existing Organization unless there are no memberships.

### `/organization/[id]/overview`

The shell contains:

- explicit product switcher: Profile / Organization;
- current Organization switcher with visible name and the viewer’s role;
- role-aware primary navigation;
- visible command/search trigger with a non-keyboard path;
- mobile navigation drawer with the same destinations and current context;
- no tenant ID, backend status, freshness, queue name, or provider detail.

The overview contains:

1. short Organization identity and role context;
2. one dominant next action the viewer can perform;
3. `Needs attention` queue with consequence, scope, and exact destination;
4. operational summary by lifecycle stage;
5. active Opportunities/Programs list;
6. recent customer-safe activity only when useful and authorized;
7. explicit empty or limited-access explanation instead of zero-card theatre.

Counts are links to exact filtered destinations. A count is omitted when the viewer cannot know it; it is never shown as zero to disguise restricted access.

## 6. Overview priority model

The overview orders work by consequence, not by whichever model has the largest count:

1. payment, access, privacy, or publishing blockers;
2. applicant-facing decisions/messages requiring confirmation or recovery;
3. overdue assigned reviews and post-acceptance delivery tasks;
4. submissions waiting for triage or assignment;
5. draft Opportunities blocked from publishing;
6. informative progress and recent activity.

The UI does not expose a numeric “health,” “confidence,” “completeness,” or productivity score. Delayed backend jobs appear only as a customer consequence such as “Decision emails are still being prepared”; worker names and processing timestamps stay internal.

## 7. Taxonomy in Organization overview

The chooser does not use the creative-practice taxonomy.

The overview may summarize the taxonomy of a specific Opportunity only when it helps identify that call. It must not aggregate all 1,084 terms into charts or present taxonomy as Organization identity.

The future call builder keeps these independent:

- creative-practice rules: accepted, preferred, required, excluded canonical term IDs across 12 facets;
- opportunity type;
- eligibility;
- geography/reach;
- deadline and schedule;
- fee/payment;
- form categories and questions.

Conflicting ancestor/descendant taxonomy rules, deprecated terms, unknown term IDs, and imported legacy categories require explicit review before publishing. The overview can link to the blocked draft but does not attempt to resolve the conflict inline.

## 8. Required fixtures

Every visual direction must exercise the same fixtures:

1. no memberships;
2. one Organization / owner;
3. multiple Organizations with different roles;
4. pending invitation;
5. suspended/unavailable Organization;
6. new Organization with no Teams, Programs, or Opportunities;
7. active Organization with several Programs and Opportunities;
8. role-limited reviewer;
9. program manager limited to assigned Programs;
10. finance-only view;
11. viewer/read-only mode;
12. long Organization and Opportunity names;
13. large portfolio and large attention queue;
14. draft Opportunity blocked by taxonomy/eligibility conflict;
15. submissions awaiting triage;
16. overdue reviews;
17. mixed per-Work decisions awaiting communication;
18. partial message delivery or message preparation failure;
19. overdue delivery task and task without a due date;
20. billing past due or seat limit reached, owner/admin only;
21. overview projection unavailable;
22. Organization switch interrupted or no longer authorized;
23. foreign Organization/object ID;
24. command search with no results;
25. mobile urgent-action path.

## 9. Interaction and mutation rules

- Switching Organization changes every Organization-scoped link and cached query as one context change. No content from the previous Organization may flash after selection.
- The selected Organization lives in the URL and server session projection; local state alone is insufficient.
- Consequential actions state their scope before confirmation: publish, send decisions, change access, cancel billing, remove the last owner, or disconnect payouts.
- Role-limited users do not receive dead owner/admin controls. They receive the action they can take or a concise explanation where the missing capability itself matters.
- Every async action preserves input, announces success or failure, and offers a safe retry.
- Command search accelerates navigation but never becomes the only way to reach a destination.
- Overview rows contain one primary link. Overflow menus hold genuinely secondary actions and never hide the only path.

## 10. Responsive and accessibility contract

- Desktop: persistent Organization rail, compact 36px controls for frequent operators, optional detail panel, 48px data rows.
- Tablet: collapsible rail and labelled rows; review/approval tasks remain fully usable.
- Mobile: 44px controls, explicit Organization switcher, drawer navigation, stacked labelled summaries, and no squeezed desktop table.
- The mobile overview keeps urgent read/approve/retry actions available. It may recommend desktop for bulk configuration but cannot block essential recovery.
- One H1 per route; named primary, Organization, and section navigation.
- Current Organization and current destination are exposed with text and `aria-current` where appropriate.
- Menus, drawers, dialogs, and command search manage focus, Escape, and trigger restoration.
- Counts and changes are announced when filters or Organization context changes.
- Status never relies on color alone. Role names and permission consequences are plain text.
- Keyboard shortcuts have a visible button and are disabled in text-entry contexts.

## 11. Content and visual contract

- True-white canvas and white surfaces.
- Aubergine only for primary action, focus, and restrained current-state emphasis.
- Lichen for confirmed/completed, ochre for time-sensitive attention, mineral blue for neutral operational information, red for destructive/failure.
- Compact operational rhythm: 16px panels, 8–16px gaps, hairline borders, restrained radius and shadow.
- Cards are limited to summaries, grouped controls, and non-tabular modules. Operational inventories are structured lists or tables with mobile labelled-row fallbacks.
- Use `Organization`, `Team`, `Program`, `Opportunity`, `Submission`, `Work`, `Review`, and `Decision`.
- Never render `Workspace`, `Entity`, `Open Call` as the primary object name, `Submission Path`, tenant ID, scheme version, source freshness, confidence, or worker language.

## 12. Architecture and promotion gates

The selected local composition cannot enter product routes until:

- a typed membership/capability projection exists for all ten roles;
- the Organization chooser has explicit zero/one/many/invite/unavailable behavior;
- Organization switching invalidates prior tenant state and preserves URL context;
- overview counts are tenant-scoped, role-scoped, and linked to exact filtered queues;
- missing invitation/suspension contracts are implemented or deliberately removed from launch scope;
- Team/Program/Opportunity summary projections and attention reasons are typed;
- message and delayed-job states expose only customer-safe consequences;
- current stale shell tests are replaced with Organization-language, role, tenant-leakage, keyboard, and responsive coverage;
- 320px, 390px, tablet, desktop, 200% zoom, keyboard, screen-reader, and reduced-motion runtime QA pass;
- product route diff and authenticated integration are reviewed explicitly.

Until then, all Organization chooser and overview work remains under `/design-system/*`.
