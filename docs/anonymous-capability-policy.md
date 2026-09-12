# Anonymous capability policy

This is the product boundary for a visitor who has not authenticated. Public
discovery stays useful; private state, communication, and creator work stay
account-owned.

## Visitor can do

- Browse, search, filter, and paginate published Opportunities.
- Open an Opportunity, Organization, or Journal profile.
- Read source-backed details, eligibility notes, deadlines, and missing-data
  states.
- Open the official guidelines or application destination. This is an external
  handoff, never proof that an application was submitted.
- Choose an explicit account action from a public page.

## Visitor cannot do until signup/login

| Action | Trigger | Return after authentication |
| --- | --- | --- |
| Save / Track an Opportunity | Save button or “Add to calendar” | Opportunity, then Tracker/Calendar |
| Add a deadline to Missa Calendar | Calendar action | Opportunity, then Calendar |
| Follow an Organization or Program | Follow action on a public profile or Opportunity | Original page |
| Goals, Following, Inbox, Profile, Library, Tracker, Calendar | Navigation or direct URL | Requested private route |
| Prepare, upload, report, or submit | Action requiring private work or account ownership | Requested work item |

Arrival on a public page never creates an account and never opens a waitlist
form by itself. Signup is deliberate and preserves a safe internal return path.

## Calendar rule

The public Opportunity action does not download an `.ics` file. An authenticated
visitor’s first calendar action saves the Opportunity through the existing
Tracker authority; a confirmed deadline is then projected to Missa Calendar.
Already-tracked Opportunities open the Calendar view. External calendar
subscription remains an explicit, authenticated integration in Profile and is
not implied by a single click.

## Proof gates

- Anonymous public routes render without a session and contain no private data.
- Save, calendar, and follow actions redirect to signup/login with a bounded
  `next` path.
- Signup/login cookies remain `HttpOnly`, `SameSite=Lax`, secure in production,
  root-scoped, and expiry-bounded.
- Authenticated save creates at most one Tracker item and one official deadline
  projection under the existing idempotency and outbox paths.
- Follow mutations remain account-scoped and revision/idempotency protected.
