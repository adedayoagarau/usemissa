---
title: Missa shared shells and navigation contract
version: "1.0"
status: contract-ready-for-local-visual-comparison
date: "2026-08-08"
product_promotion_status: blocked
---

# Missa shared shells and navigation contract

## 1. Purpose

Missa needs five related but distinct shells:

1. **Public** — understand Missa, browse Opportunities, read Guides, and enter an account journey.
2. **Profile** — find Opportunities and manage the private work of applying.
3. **Organization** — operate calls, submissions, reviews, decisions, communication, delivery, people, and settings inside one tenant.
4. **Reviewer** — complete only assigned review work without Organization administration.
5. **Platform Admin** — operate Missa itself across tenants with explicit evidence and capability boundaries.

The shell is not decoration around a page. It owns identity, current product, current tenant, location, back-state, mobile navigation, utility destinations, and safe transitions between products.

## 2. Current implementation truth

Repository inspection on 8 August 2026 found:

- public pages implement several unrelated headers instead of one public shell;
- the authenticated `AppNav` exposes Home, Ask Missa, Opportunities, Tracker, Submissions, Library, Calendar, Messages, and Insights as peer destinations, despite Calendar, Messages, Insights, and My submissions now being canonical views or sections;
- Profile and Organization access is split between top navigation, account menu, mobile menu, and a query-string Organization picker;
- the Organization shell uses `/workspace` and `organizationId` query parameters and renders a second navigation region beneath the global header;
- the Organization navigation labels its first destination `Organization` rather than the user’s current job, Overview;
- People links to an anchor in the `/workspace` monolith while a separate `/workspace/people` route also exists;
- the reviewer route inherits the Organization shell even though reviewers require a focused assignment-only product;
- Platform Admin has a separate shell, but its current groups are Organization, Operate, and System rather than the selected Operate, Review, Serve, and Business model;
- `/admin/taxonomy` lives under the `(workspace)` filesystem group and authenticates separately, creating ambiguous shell ownership;
- the current root layout correctly owns global typography, analytics, theme, and toasts, but it does not provide a public navigation/footer system.

These are route and responsibility problems, not reasons to choose a more elaborate navigation component.

## 3. Canonical product language

Customer-facing product names are:

- **Profile**
- **Opportunities**
- **Tracker**
- **Library**
- **Organization**

`Passport` and `Workspace` are migration-era implementation names and must not render. `Radar` is reserved for Platform Admin. `Trust Layer`, confidence, freshness, source health, worker state, and taxonomy graph terminology do not belong in customer navigation.

## 4. People and shell projections

| Person/state | Shell projection | Must not see |
| --- | --- | --- |
| Signed-out visitor | Public navigation plus Log in and Create account | Private Profile state, Organization membership, Admin destinations |
| Signed-in creator, no Organization | Profile shell | Empty Organization administration or a disabled switcher |
| Signed-in creator, one Organization | Profile shell with a visible Organization switch; Organization shell with the Organization name | Hidden Organization access only inside the avatar menu |
| Signed-in creator, several Organizations | Product switch plus named Organization switcher | A selector that changes tenant while silently retaining an incompatible child route |
| Invited Organization member | Safe return into the invited Organization and role-allowed destination | Creator onboarding forced before accepting the invite unless genuinely required |
| Reviewer-only user | Reviewer shell and assigned queue | Owner/admin navigation, other submissions, tenant-wide counts |
| Organization Owner/Admin | Organization shell with capability-allowed areas | Platform Admin solely because the person administers one Organization |
| Role-limited Organization member | Same stable information architecture with disallowed areas omitted or explained by route policy | Dead controls that imply access; data from another Organization |
| Platform operator | Platform Admin shell | Unscoped secrets, raw provider payloads, unrestricted private submission/file content |
| Expired/removed user | Safe sign-in or access-lost state with the intended destination retained when lawful | Stale tenant data or a false empty state |

## 5. Shell information architecture

### 5.1 Public

Primary: **Home · Opportunities · Guides · For organizations**  
Account: **Log in · Create account** or **Open Missa** when signed in.

Rules:

- the wordmark returns to public Home;
- the current section is marked semantically and visually;
- Create account remains visible in the mobile navigation;
- public Opportunity browse/detail share the same shell whether signed in or out;
- article and collection pages retain a clear route back to Opportunities;
- the footer repeats useful destinations, policy, issue reporting, and Organization entry without becoming a sitemap wall.

### 5.2 Profile

Primary: **Opportunities · Tracker · Library**  
Utilities: **Inbox · Profile**  
Product switch: **Organization** when at least one membership exists.

Rules:

- Calendar is a Tracker view;
- My submissions is a Tracker view;
- Messages is an Inbox section;
- Insights remains a Tracker/Profile view until it has a distinct supported decision;
- Ask Missa is a capability-gated utility, not a permanent primary destination;
- Profile is both identity/account access and the home for matching/privacy settings; those roles must be clearly separated inside the Profile page;
- switching to Organization preserves no creator-only filters that would be misinterpreted in tenant context.

### 5.3 Organization

Primary: **Overview · Opportunities · Submissions · Reviews · Decisions**  
Secondary: **Messages · Delivery · Insights · People · Settings**.

Rules:

- every canonical Organization URL contains the Organization identifier;
- the shell names the current Organization and exposes a switcher when more than one membership is available;
- changing Organization recomputes a valid destination rather than appending a query parameter to an incompatible record route;
- role/capability projection occurs on the server and the client shell receives only permitted navigation and actions;
- counts are links to exact URL-backed queues, not decorative totals;
- urgent read/approve/reply work remains usable on mobile even when builders are desktop-optimized;
- Profile is a visible product switch, not a route hidden in account settings.

### 5.4 Reviewer

Primary: **Reviews**  
Utilities: **Help · Inbox · Profile**.

Rules:

- the shell is intentionally smaller than Organization;
- no Organization switch is shown unless a reviewer truly has assignments in several Organizations, and then it filters assignment context rather than granting tenant navigation;
- assignment identity, blind-review policy, due state, and progress live in the work surface, not global navigation;
- successful submission moves to the next permitted assignment or a clear done state.

### 5.5 Platform Admin

Groups:

- **Operate:** Control Room, Operations, Agents, Radar, System
- **Review:** Content, Taxonomy, Governance, Audit
- **Serve:** Customers, Organizations, CRM, Support, Messaging
- **Business:** Billing, Analytics

Rules:

- availability is capability-based, not one global visual `isAdmin` assumption;
- details have stable routes or URL state;
- internal operational vocabulary is allowed only here;
- Admin does not inherit customer shells or tenant switching;
- mobile navigation is a full operable route menu, while evidence details use list-to-detail continuity.

## 6. Route and transition contract

| Transition | Required continuity |
| --- | --- |
| Public Opportunity → login/signup → return | Exact canonical Opportunity, query origin, section anchor, and safe `next` validation |
| Public browse → signed-in browse | Query, filters, sort, pagination, and selected-result context |
| Profile → Organization | Chosen Organization or chooser; no accidental reuse of creator-only query keys |
| Organization → Profile | Return destination may be remembered locally, but no tenant data is placed in a public URL |
| Organization A → Organization B | Revalidate membership and capabilities; map to equivalent safe collection route or Overview, never the same record ID by assumption |
| Inbox item → target | Return path and read state; deleted/forbidden targets remain distinguishable |
| Tracker → Calendar → detail → back | View/date/filter, selected item, and focused origin |
| Reviewer invite → auth → assignment | Invite token exchange, exact assignment, blind projection, and safe failure state |
| Admin queue → detail → action → return | Filter/sort/page, selected item, capability version, action receipt, and focused origin |

## 7. Taxonomy boundary

Navigation never becomes a mirror of all 1,084 terms or the 12-facet graph.

- public navigation may link to curated collections with stable canonical IDs;
- Opportunity browse owns type, practice, geography, fee, and deadline filters while keeping those concepts separate;
- Profile navigation never displays private matching terms;
- Organization navigation scopes work by lifecycle and program, not creative-practice labels;
- Admin Taxonomy is the only shell destination for graph governance;
- stale or deprecated terms change page/filter state, not global navigation labels.

## 8. Responsive contract

### 320–767px

- one 44px-minimum menu trigger with an accessible changing label;
- wordmark/product identity and the current high-level product remain visible;
- no desktop rail is squeezed above the content;
- the opened menu has a clear heading, current location, close action, logical groups, and visible account/product switch actions;
- the menu closes on navigation, Escape, and focus-safe dismissal;
- route changes restore focus to the page heading or a deliberate work target;
- fixed headers account for zoom, safe-area insets, software keyboards, and long translated labels.

### 768–1199px

- compact navigation may use a menu or reduced labels, but the current Organization and product remain explicit;
- multi-pane work surfaces transform independently of the shell;
- no essential destination exists only in a hover menu.

### 1200px and wider

- public and Profile shells may use a horizontal bar;
- Organization, reviewer, and Admin may use a rail when task density justifies it;
- rails remain landmarks and do not duplicate the same links in the header;
- content width follows page job rather than one global max-width wrapper.

## 9. State and edge-case matrix

Every shell direction must exercise:

- signed out, signed in, session expired, and unsafe return path;
- creator with zero, one, and several Organizations;
- Organization membership removed while open;
- long Organization and person names, Unicode, and RTL-isolated labels;
- reviewer-only and mixed reviewer/member accounts;
- Platform Admin with full, read-only, and missing capabilities;
- active item in a nested detail route;
- unavailable destination, feature-flagged Ask, and compatibility redirect;
- 320, 390, 768, 1280, and 1536px widths;
- keyboard-only use, screen-reader landmarks/names, 200%/400% zoom, reduced motion, and high contrast.

An unavailable subsystem does not remove unrelated navigation. An unauthorized route does not become an empty page. A missing membership does not silently switch to the first Organization.

## 10. Accessibility and semantics

- one identifiable primary navigation landmark per shell; additional navigation landmarks have unique names;
- current route uses `aria-current="page"` and a non-color visual treatment;
- product/Organization switchers have persistent accessible names and announce the resulting context after navigation;
- icon-only utilities have names and at least 44px targets on touch surfaces;
- menus and dialogs follow established focus, Escape, and return-focus behavior;
- account initials are decorative when adjacent account text exists and labelled when used as the only trigger content;
- email addresses and internal IDs are not the primary identity label when a safe display name exists;
- skip navigation reaches the page’s main heading/work region;
- the shell does not create nested `<main>` landmarks.

## 11. Premium component gate

Premium references may provide anatomy for navigation menus, dropdowns, commands, avatars, Sheets, breadcrumbs, scroll areas, and resizable workspaces. A candidate is rejected when it:

- decides the product information architecture;
- turns all routes into equal top-level links;
- hides Profile/Organization switching in an avatar menu;
- requires hover for essential navigation;
- assumes one tenant or one role;
- puts Organization context only in client query state;
- introduces a separate palette, type scale, radius, or motion language;
- cannot preserve focus and current state across mobile list/detail transitions;
- exposes customer-facing freshness, confidence, source health, or taxonomy graph detail.

## 12. Local comparison brief

Three structurally distinct directions should be compared with the same people, routes, and edge fixtures:

1. **Editorial masthead** — public and Profile surfaces emphasize a calm horizontal identity; Organization/Admin use a grouped rail.
2. **Product switcher** — one explicit Profile/Organization switch anchors a compact task navigation; role-specific reviewer/Admin shells remain separate.
3. **Context rail** — a slim persistent product/context rail supports dense signed-in work while public pages retain an editorial header.

The selected solution may synthesize strengths, but it must still produce one canonical shell contract per product rather than a visually clever universal navigation.

## 13. Promotion gates

Before any product shell is changed:

- canonical route and redirect table approved;
- server-derived product, membership, Organization, reviewer, and Admin capability projections typed;
- safe return-path utility shared by login and signup;
- public/mobile/footer content approved;
- Organization switch behavior defined for every collection and detail route;
- analytics naming uses Profile and Organization;
- no `Workspace` or `Passport` customer strings remain in promoted scope;
- desktop/mobile keyboard, screen reader, zoom/reflow, reduced-motion, and high-contrast QA passes;
- each affected current route has parity or an explicit retirement decision;
- rollback preserves current route access.

Product promotion remains blocked until a local direction is selected and a page-family implementation is explicitly approved.
