# Missa Organization Settings and Billing screen contract

Date: 8 August 2026  
Status: Option 2 implemented as a local read-only Organization projection; mutations and production promotion blocked  
Selected visual direction: **02 — Control centre**

## 1. Purpose

Settings and Billing lets authorized Organization members understand and change how the Organization is identified, structured, secured, connected, governed, and paid for. It must answer:

1. What am I changing?
2. Who is allowed to change it?
3. When does the change take effect?
4. What will stop working or become unavailable?
5. How can the Organization recover if the change fails?

Every settings domain is an independent transaction. There is no page-wide Save button, no silent high-risk auto-save, and no assumption that an Organization Admin is also an Owner or billing contact.

## 2. Current implementation truth

The current `/workspace/settings` screen contains one billing card. The current server can:

- read an Organization's plan, subscription status, cancellation flag, and Stripe Connect state;
- start checkout for Indie, Pro, or Program plans;
- schedule subscription cancellation at the end of the billing period;
- start Stripe Connect onboarding for submission-fee payouts;
- report one flat seat count where every Organization membership consumes one seat;
- allow legacy `admin` authorization checks to include both Admin and Owner.

The current server does not yet provide customer-facing mutations or durable models for:

- Organization public name, legal name, slug, logo, address, locale, timezone, or default currency;
- independently managed Entities/teams and Programs from this settings route;
- sender identity, reply-to address, custom sending domain, or communication defaults;
- custom domains and DNS verification lifecycle;
- SSO, SCIM, enforced MFA, session policy, approved domains, or recovery contacts;
- Organization-level integrations, webhooks, API keys, secret rotation, or provider health;
- retention policy, legal hold, Organization export, archive, restore, or deletion;
- invoices, payment methods, tax details, billing contacts, renewal date, proration preview, resumption, or immediate cancellation;
- differentiated Core, Reviewer, Viewer, or Guest seat classes;
- a dedicated billing-manager permission;
- optimistic concurrency or stale-form comparison for settings.

The local composition may demonstrate these required states, but unsupported controls remain labelled as contract targets and are not wired to product APIs.

The canonical local `/organization/[id]/settings` route now applies the Control centre to the current Organization read model. Owner and Admin can inspect all eight domains; Finance receives Billing and payouts only. General shows the current public name and domain-verification facts, Structure shows current Team, Program, and Opportunity counts, and Billing keeps plan, subscription state, seats, and payout connection separate. Provider references are reduced to `Recorded privately` rather than exposed. Unsupported domains name their missing contracts, and no save, checkout, cancellation, payout onboarding, security, integration, retention, archive, or deletion control is rendered.

This route does not remove or authorize the older billing APIs. It deliberately withholds them until action-level capabilities, authoritative price/effective-date previews, idempotency, audit, optimistic concurrency, and recovery behavior meet this contract.

## 3. Settings domains and save boundaries

| Domain | Primary content | Save boundary | Minimum authority |
| --- | --- | --- | --- |
| General | Public name, legal name, locale, timezone, default currency | Save General | Owner or Organization Admin; legal name may require Owner |
| Structure | Entities/teams and Programs | Create/edit one record at a time | Scoped Organization Admin |
| Brand | Logo, public identity, approved colors | Save Brand | Owner or Organization Admin |
| Communications | Sender name, reply-to, sending domain, message defaults | Save Communications after verification | Owner or communications-capable Admin |
| Security | MFA policy, SSO, SCIM, session and approved-domain policy | One explicit policy change | Owner or security capability; step-up required |
| Integrations | Connection, scope, owner, rotate/revoke | One integration at a time | Integration capability; secrets never redisplayed |
| Data governance | Retention, legal hold, export | One policy/export request at a time | Owner, Legal, or export capability by action |
| Billing | Plan, billing contact, payment method, invoices, seats | One commercial action at a time | Owner or billing capability |
| Payouts | Submission-fee collection and payout account | Provider-governed connection action | Owner or Finance capability |
| Danger zone | Archive, cancel, transfer, delete | Dedicated consequence flow | Owner; step-up and server recheck |

Changing a locale does not change stored dates or currency. Changing a default currency does not convert historical amounts. Changing a sender name does not verify a domain. Buying seats does not grant permissions.

## 4. Billing and payout distinctions

- Missa subscription billing and Organization payout setup are separate products, providers states, and actions.
- Plan status, payment status, invoice status, seat entitlement, and access permission are separate facts.
- Cancellation states include not scheduled, scheduled for period end, canceled, and resumed. The effective date is always explicit.
- Past due does not silently erase access. The UI states the grace or restriction policy when the server defines one.
- Plan changes preview price, billing cadence, taxes if known, proration, effective date, and changed entitlements before checkout or confirmation.
- Annual billing may be recommended, but monthly and contract billing are not invented where unavailable.
- Payout connection states include not connected, setup incomplete, requirements due, under review, restricted, and connected. Provider IDs and internal risk details are not exposed.
- Refunds, submission fees, Organization subscription charges, and payouts never share one ambiguous “Payments” total.

## 5. Organization identity and structure

- Public name and legal billing name are distinct.
- A public URL or custom domain never becomes active before ownership and DNS verification complete.
- Logo is optional and has a text fallback. The interface does not demand an “Organization photo.”
- Timezone uses an explicit IANA zone and shows a current offset example.
- Default currency is a presentation and new-record default, not a conversion operation.
- Entity/team and Program changes name affected Opportunities and assignments before archive or reassignment.

## 6. Security and integrations

- Security policy changes require current authority and, for high-risk changes, recent authentication.
- SCIM-managed identity fields are read-only in Missa and name their controlling source.
- SSO activation includes domain ownership, test sign-in, recovery access, enforcement date, and rollback.
- API keys and webhook secrets are shown once, stored masked, and rotated or revoked with named consequences.
- Integration scopes are explicit. “Connected” does not imply access to every record.
- Failed or revoked integrations show customer-relevant effect and recovery; internal queue, provider IDs, worker state, and raw error payloads remain private.

## 7. Data governance and destructive actions

- Retention periods apply by data class and do not erase legal holds or audit history.
- Exports state included data, Organization scope, requester, expiry, and safe delivery method.
- Archiving an Organization, canceling a subscription, disconnecting payouts, and deleting an Organization are four separate actions.
- Organization deletion is delayed and reversible until its scheduled date when policy permits.
- Before deletion, the system identifies active Opportunities, open Submissions, incomplete reviews, unsent decisions, pending messages, payout balances, legal holds, and export availability.
- The last Owner cannot be removed as a side effect of any settings action.
- A stale form never overwrites a newer policy; the user compares and reloads or deliberately reapplies.

## 8. Selected information architecture candidates

### 01 — Settings index

A searchable grid of domains with concise status and next action. It is strong for discovery and first-time setup, but weak when a user needs to understand cross-domain consequences.

### 02 — Control centre

Persistent section navigation, one focused independently saved settings panel, and a status/consequence rail. On mobile, the section index becomes a compact selector and each domain reads as one linear page.

### 03 — Governance ledger

A dense matrix of domains, owners, authority, state, and last material change. It is strong for enterprise oversight, but too operational for routine editing.

**02 — Control centre** is selected. It gives routine settings enough focus, keeps commercial and governance context visible, and translates cleanly to mobile without turning the page into a wall of cards. Options 01 and 03 remain in the local comparison switcher.

## 9. Required states and adversarial fixtures

1. healthy Program plan;
2. Free plan;
3. trialing;
4. past due;
5. cancellation scheduled;
6. canceled;
7. contract Enterprise;
8. seat limit reached;
9. one seat remaining;
10. differentiated seats unavailable under current contract;
11. Owner projection;
12. Organization Admin projection;
13. Finance projection;
14. Program Manager projection;
15. Viewer projection;
16. billing capability without Organization administration;
17. payout not connected;
18. payout setup incomplete;
19. payout requirements due;
20. payout connected;
21. custom domain pending;
22. custom domain misconfigured;
23. sender domain unverified;
24. SSO not configured;
25. SSO test required;
26. SCIM-managed policy;
27. integration revoked;
28. integration scope changed elsewhere;
29. legal hold active;
30. export pending;
31. deletion blocked by active work;
32. deletion scheduled;
33. unsaved General changes;
34. stale settings version;
35. save pending;
36. save failed with draft preserved;
37. offline before save;
38. provider outage;
39. loading;
40. permission denied;
41. empty first setup;
42. long Organization/legal names;
43. Unicode names and domains;
44. missing logo;
45. 320, 390, 768, 1280, and 1536 pixel viewports;
46. keyboard-only section navigation and dialogs;
47. focus restoration after save, cancel, and destructive flows;
48. 200% and 400% zoom.

## 10. Premium Shadcn Studio anatomy

| Job | Premium anatomy | Missa adaptation |
| --- | --- | --- |
| Settings navigation | `tabs/tabs-11` and `tabs/tabs-14` behavior; `sidebar/sidebar-07` as wide-screen reference | Semantic links/buttons with current section; mobile selector preserves the section name |
| Focused settings form | `form/form-06`, `input/input-14`, `select/select-01`, `switch/switch-01` | Persistent labels, help and errors; one independent Save boundary |
| Summary/status surface | `card/card-07` and `card/card-09` | Quiet factual grouping, no decorative metrics or gradients |
| Billing and invoices | `table/table-03`, `list/list-03`, `badge/badge-04` | Separate plan, invoice, seat, and payout states; mobile labelled records |
| Plan or policy review | `dialog/dialog-06` | Explicit before/after, price/effective date, and sticky actions |
| High-risk confirmation | `alert-dialog/alert-dialog-01` | Named consequences, step-up state, typed confirmation only when proportionate |
| Connection state | `alert/alert-17`–`alert/alert-20` | Customer-relevant impact and recovery; no internal provider details |
| Mobile contextual editing | `sheet/sheet-04` only for bounded choices | Primary settings remain a page; sheet never hides a long policy or destructive flow |
| Loading and feedback | `skeleton/skeleton-11`; `sonner/sonner-02` | Geometry-matched loading; durable errors inline; toast only acknowledges success |

## 11. Product promotion gates

Promotion remains blocked until:

- settings domains have durable server models and capability checks;
- Owner, Admin, Finance, Legal, security, billing, and integration authorities are separated;
- each mutation supports validation, idempotency, audit, and optimistic concurrency;
- plan previews and invoice/payment facts come from authoritative billing records;
- seat entitlement matches the People and permissions contract;
- payout and subscription states are modeled independently;
- sender/custom-domain verification and recovery lifecycles exist;
- SSO/SCIM security invariants and recovery access are enforced;
- export, retention, legal hold, archive, and deletion policies exist transactionally;
- no secret or provider-internal detail leaks to customer UI;
- keyboard, focus, screen-reader, touch, phone, tablet, zoom, failure, stale-edit, and rollback QA pass;
- the user explicitly approves product integration.
