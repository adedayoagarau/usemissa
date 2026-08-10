# Missa front-end information architecture

Status: current-state audit and target navigation contract

This document describes how a person moves through Missa, where state lives, and which surface owns each job. It is intentionally separate from visual design. The design system governs the visual language; this document governs route purpose, naming, navigation, and state continuity.

## Product surfaces

Missa has four surfaces. They share identity and the canonical taxonomy, but they do not share the same primary job.

| Surface | Entry | User | Primary job |
| --- | --- | --- | --- |
| Public | `/` | visitor | Understand Missa and choose creator or organisation path |
| Profile | `/home` | submitter/creator | Find, prepare, submit, and track work |
| Organization | `/workspace` | organisation/team | Publish calls, collect submissions, review, decide, and deliver |
| Platform admin | `/admin` | Missa operator | Operate Opportunities, content, customers, taxonomy, and system health |

The public site is acquisition. Profile and Organization are authenticated products. Platform admin is tenant-independent and must never be presented as a normal product destination.

## Canonical state contract

The browser URL is the durable state for discovery. A reload, share, back button, or login redirect must preserve it.

```text
OpportunityBrowseState {
  q?: string
  category: all | magazines | grants | awards | residencies | fellowships | contests | more
  taxonomyTermIds: string[]                 // canonical IDs only
  taxonomySchemeVersion: number             // current @missa/taxonomy scheme
  taxonomyIncludeDescendants: boolean
  locations: string[]
  feeStatus?: no-fee | paid | unknown
  deadlineWithinDays?: number
  verifiedOnly: boolean
  openNow: boolean
  sort: recommended | soonest-deadline | recently-verified | recently-added
  cursor?: string
  selectedOpportunityId?: string
}
```

The source of truth is `@missa/taxonomy`. The web UI, query parser, Opportunities resolver, relational assignments, Organization rules, and the `/api/taxonomy` catalog seam must use the same stable term IDs and scheme version. Labels are presentation; IDs are state.

### Public browse language

The taxonomy graph remains independent and multi-facet. Profile deliberately exposes a small guided hierarchy:

1. **Discipline** → practice family (`Writing & literature`, `Visual arts`, `Film & moving image`)
2. **Genre** → canonical discipline under that family (`Poetry`, `Fiction`, `Photography`)
3. **Style** → canonical genre under that discipline (`Epic poetry`, `Lyric poetry`, `Literary fiction`)

This is a presentation projection, not a rewrite of the storage facets. Form, subgenre, medium, technique, mode, role, theme, audience, and language remain available to matching, profile, Works, and Organization rules without being dumped into the browse toolbar.

## Target navigation

### Public acquisition

| Route | Purpose | Primary action | Next state |
| --- | --- | --- | --- |
| `/` | Explain the opportunity layer and the two audiences | `Get started` / `For organizations` | `/signup` or `/for-organizations` |
| `/for-organizations` | Explain the cheaper, faster submission portal | `Run your next call on Missa` | organisation signup/contact flow |
| `/login` | Authenticate an existing account | `Log in` | return to the encoded `next` URL |
| `/signup` | Create an account and choose creator/organisation intent | `Create account` | onboarding state |
| `/opportunities-preview` | Public, limited discovery proof | `Create profile to see matches` | `/signup?next=...` |

Public pages must not create a second taxonomy vocabulary. If the preview shows filters, it uses the same `OpportunityBrowseState` and catalog as Profile.

### Profile (submitter)

| Route | Owns | Primary action | Required continuity |
| --- | --- | --- | --- |
| `/home` | personalised starting point | `Explore opportunities` | profile preferences and saved searches |
| `/opportunities` | discovery and comparison | select a term, track, apply/view call | URL query, taxonomy version, selected card |
| `/opportunities/[id]` | opportunity decision | review fit, requirements, `Go to submission` | originating browse query and opportunity ID |
| `/tracker` | work-in-progress pipeline | update status, attach Work | opportunity ID, submission status |
| `/my-submissions` | submitted work and decisions | open a submission | account + submission ID |
| `/my-submissions/[submissionId]` | submission detail | update/withdraw/respond | submission ID and deadline state |
| `/library` | reusable Works, files, answers | add/edit a Work or material | Work taxonomy assignments and privacy |
| `/calendar` | deadline and response planning | open an event | opportunity/submission ID |
| `/messages` | organisation and Missa communication | open/reply | thread ID |
| `/insights` | personal activity and conversion feedback | act on a recommendation | account and tracker data |
| `/profile` | identity, preferences, privacy, integrations | complete/edit profile | taxonomy preferences, Works, saved searches |

`Profile` is the product name. “Profile” is an implementation/surface term, not user-facing IA.

### Organization (organisation)

| Route | Owns | Primary action | Required continuity |
| --- | --- | --- | --- |
| `/workspace` | organisation switcher and operating overview | open an organisation | `organizationId` in URL/session |
| `/workspace?organizationId=` | organisation dashboard | create/open a call | selected organisation |
| `/org/[organizationId]` | public organisation profile | view published calls | organisation ID |
| `/org/[organizationId]/[openCallId]` | public call detail | submit to a call | organisation + call ID |
| `/submissions?organizationId=` | intake and submission queue | triage a submission | organisation ID, filters, queue state |
| `/reviewer` | assigned review work | complete a review | reviewer assignment ID |

Organization must have an explicit organisation switcher in its shell. It should not depend on a hidden profile-menu link to be discoverable.

### Platform admin

| Route | Operational question answered |
| --- | --- |
| `/admin` | Is the platform healthy and what needs attention? |
| `/admin/customers` | Which accounts and organisations need support? |
| `/admin/content` | Which opportunities and sources need editorial action? |
| `/admin/analytics` | Are discovery, matching, and submission funnels working? |
| `/admin/operations` | What queues and jobs are blocked or delayed? |
| `/admin/operations?queue=agents` | What are the research/review agents doing? |
| `/admin/radar` | Is source freshness and extraction healthy? |
| `/admin/system` | Are infrastructure and integrations ready? |
| `/admin/audit` | Who changed what and when? |
| `/admin/taxonomy` | Are terms, mappings, proposals, and coverage governed? |

## Journey contracts

### Creator: first visit to submission

```text
Landing → Signup → Onboarding/profile preferences → Home
  → Opportunities (URL-backed taxonomy selection)
  → Opportunity detail (same query + selected ID)
  → Library/Work preparation
  → Submission path
  → Tracker + My submissions + Calendar
```

The user should never lose the selected practice, search text, or originating opportunity when authentication or a submission redirect occurs.

### Organisation: first visit to a published call

```text
Organisation landing → Organisation signup → Organization
  → Create call → Define submission paths and canonical taxonomy rules
  → Preview → Publish
  → Public call page → Submission inbox
  → Review round → Decision → Delivery/notification
```

The same taxonomy term ID controls call eligibility, intake form routing, matching explanations, reviewer assignment, and analytics. Eligibility (identity, age, geography, career stage) remains a separate rule system.

## Current IA risks found

1. Organization and reviewer destinations are mostly hidden in the profile dropdown while Profile destinations occupy the primary shell.
2. `/profile`, `/my-submissions`, and several organisation routes sit outside the Profile route group and can render a different shell or lose shared state.
3. Legacy `discipline`, `genres[]`, and free-text saved-search fields remain compatibility inputs. They must be read only during migration, never used to create new UI state.
4. Taxonomy options were previously duplicated in `opportunityTaxonomy.ts` and `taxonomyOptions.ts`. They now consume the shared `@missa/taxonomy` browse helpers.
5. A URL can contain stale or arbitrary taxonomy IDs. The parser now normalizes to selectable canonical IDs and records the scheme version before repository SQL.
6. The public API now exposes `/api/taxonomy` so Profile, Organization tooling, and future mobile clients have a versioned catalog seam.
7. A “style” option can be structurally valid but have no evidence-backed opportunity assignments yet. The UI must explain an empty result as coverage state, not claim that no such opportunities exist.
8. Search, filter, detail, tracker, and submission states need explicit analytics events so we can see where people abandon the journey.

## Implementation rules

- Never store a label in browse state when a canonical term ID exists.
- Never infer eligibility from a practice or genre term.
- Keep source phrase, evidence, origin, and certainty with every assignment.
- Use the same state object for server rendering, client transitions, saved searches, and mobile/API consumers.
- Preserve legacy fields during the compatibility window, but do not expose them as new controls.
- Use `true white` surfaces and the existing Missa design tokens; IA changes must not reintroduce paper-colour backgrounds.

## Next IA build sequence

1. Put an explicit Profile/Organization switcher in the authenticated shell and preserve `organizationId` across all Organization links.
2. Move `/profile` and `/my-submissions` into the shared authenticated shell or extract one shared shell component so navigation and pending states are identical.
3. Replace the saved-search and profile “practice” controls with the shared three-layer taxonomy picker, plus an advanced facet drawer for medium, language, audience, and eligibility.
4. Add a shared breadcrumb/back-state contract for opportunity detail, submission preparation, tracker, and calendar.
5. Add coverage-aware empty states and analytics for every taxonomy selection, zero-result query, apply click, save, and return from detail.
6. Re-run page-by-page mobile/accessibility QA after the shell and state changes.
