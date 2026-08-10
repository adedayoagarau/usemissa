# Missa Organization People and permissions screen contract

Date: 8 August 2026  
Status: Option 2 implemented as a local read-only Organization projection; mutations and production promotion blocked  
Selected visual direction: **02 — Access dossier**

## 1. Purpose

People and permissions helps an authorized Organization administrator answer four questions:

1. Who can enter this Organization?
2. What can each person do?
3. Where can they do it?
4. What must be reassigned or protected before access changes?

This is not merely a seat counter or a list of role names. Commercial seat class, permission bundle, resource scope, invitation state, account state, and work assignment are separate concepts.

## 2. Current implementation truth

The current product stores one Organization membership per account with one of ten string roles:

`member`, `admin`, `owner`, `team-admin`, `program-manager`, `reviewer`, `finance`, `legal`, `viewer`, or `guest`.

Current behavior can:

- list active memberships;
- add an existing Missa account by exact email;
- replace a membership's single Organization-wide role;
- remove a membership;
- count every membership against the same Organization seat limit;
- permit Owner or Admin through legacy Admin authorization checks;
- prevent removing or demoting the final combined Admin-or-Owner membership;
- append basic role-change and revocation audit events.

Current behavior cannot honestly support:

- invitations for an email without an existing Missa account;
- pending, accepted, expired, revoked, bounced, or resent invitation states;
- team, Entity, Program, Opportunity, review-round, or submission scopes on a membership;
- multiple roles or different roles in different scopes;
- custom permission bundles;
- distinct core, reviewer, viewer, or guest seat classes;
- safe ownership transfer as a dedicated operation;
- last-owner protection distinct from last-elevated-member protection;
- deactivation, suspension, SSO/SCIM ownership, MFA, session, or last-login state in this customer UI;
- reassignment of owned review assignments, decisions, messages, or delivery obligations before removal;
- bulk invite or bulk role changes;
- user-facing permission previews generated from a versioned capability registry.

The canonical local `/organization/[id]/people` route now provides an Owner/Admin read-only Access dossier over current memberships. It distinguishes the compatibility membership seat, Organization-wide role, account/provisioning hints, current route projection, review assignments, Decision authorship, and access-change safeguards. Team Admin receives no Organization-wide directory until Team scope is enforced. No invite, role, removal, transfer, or seat mutation is exposed.

The local screen may model these as required states, but it must label unsupported capabilities and must not connect them to product mutations.

## 3. Concept model

| Concept | Meaning | Must not be confused with |
| --- | --- | --- |
| Person | A human or provisioned account identity | One membership row |
| Membership | Access edge between a person and an Organization | Commercial seat class |
| Role | Named bundle of capabilities | Resource scope |
| Scope | Organization, Entity/team, Program, Opportunity, review round, or assigned records | Role |
| Seat | Commercial entitlement consumed by a membership | Permission |
| Invitation | Time-bounded offer to establish a membership | Active access |
| Assignment | Operational responsibility such as a review or delivery obligation | Permission grant |
| Account state | Active, suspended, or deprovisioned identity state | Invitation state |

Creative-practice taxonomy is not used to grant permissions. A reviewer may be routed to Works through practice expertise, but practice-family, discipline, form, genre, medium, and other facets remain content classification—not authorization.

## 4. Default role bundles

These are product-language bundles, not a claim that the current server enforces every capability.

| Role | Intended job | Default scope | Key boundary |
| --- | --- | --- | --- |
| Organization Owner | Governance, ownership, security, billing, and all operations | Whole Organization | Ownership transfer is explicit and step-up protected |
| Organization Admin | People, Opportunities, workflows, and Organization operations | Whole Organization | Cannot silently take ownership |
| Team Admin | Operate one Entity/team | Assigned Entity/team | Cannot administer other teams or Organization ownership |
| Program Manager | Run assigned Programs and Opportunities | Assigned Programs | No unrelated Program access by inheritance |
| Reviewer | Review assigned Submissions/Works | Assigned rounds or records | No general submitter identity, finance, or other reviewer notes unless granted |
| Finance | Fees, refunds, waivers, payouts, and finance exports | Assigned Organization/Entity/Program | No artistic scores or private reviewer notes |
| Legal | Agreements, rights, consent, retention, and audit | Assigned Organization/Entity/Program | No artistic ranking or unrelated finance detail |
| Viewer | Approved read-only dashboards and exports | Explicit scope | No mutations and no restricted drill-down |
| Guest | Temporary, narrow external access | Explicit assignment | Expiry required; no implicit Organization browse |
| Legacy member | Compatibility role requiring review | Current Organization membership | Not offered for new invitations until mapped to capabilities |

## 5. Primary tasks

### Directory and discovery

- Search by name or email.
- Filter independently by access state, role, seat class, team, Program, and invitation state.
- See one person's effective access without opening every row.
- Identify legacy, over-broad, expiring, pending, or unassigned access.

### Invite

- Enter email and optional display name.
- Choose role bundle and resource scope separately.
- Explain the effective capabilities before sending.
- Choose seat class when the commercial model supports it.
- Require an expiry for Guest access.
- Handle existing member, existing pending invite, seat limit, unknown domain, duplicate email, bounced mail, and revoked invite.
- Resending extends or replaces a token without creating duplicate memberships.

### Change access

- Show before and after roles, scopes, and capabilities.
- Explain any lost access and affected assignments.
- Require an explicit save; never mutate immediately from a table select.
- Recheck authorization and current state at commit time.
- Record actor, subject, before, after, scope, reason, and timestamp in audit history.
- Announce success or failure and restore focus to the initiating row.

### Remove or deactivate

- Prefer reversible deactivation where enterprise identity supports it.
- Name review assignments, draft ownership, message approvals, delivery obligations, and other work that needs reassignment.
- Block removal of the last Owner.
- Block self-removal when the person is the sole Owner.
- Treat ownership transfer as a separate flow requiring a destination Owner and step-up verification.
- Keep historical authorship and audit records after access ends.

## 6. Capability model

Before product promotion, role checks must be replaced or wrapped by a typed capability registry. At minimum, the UI needs read-only answers for:

- `organization.people.read`
- `organization.people.invite`
- `organization.people.change_role`
- `organization.people.change_scope`
- `organization.people.deactivate`
- `organization.people.remove`
- `organization.ownership.transfer`
- `organization.seats.read`
- `organization.seats.allocate`
- `organization.audit.read`
- `organization.exports.manage`
- relevant Opportunity, Submission, review, decision, messaging, delivery, finance, legal, settings, and integration capabilities.

The client may explain capabilities, but the server remains authoritative and revalidates at mutation time.

## 7. Ownership and concurrency

- An Organization always has at least one active Owner.
- Admins do not count as Owners for ownership continuity.
- A new Owner must accept transfer before the previous sole Owner can leave.
- Concurrent changes use a version or `updatedAt` precondition. A stale editor receives a comparison instead of overwriting newer access.
- SCIM-managed fields are read-only in Missa and identify their provisioning source.
- If a person is deprovisioned while a dialog is open, saving fails closed and refreshes the effective state.

## 8. Seat rules

- Seat availability is shown as commercial capacity, not authorization.
- Pending invitations reserve a seat only if the billing contract explicitly says so; the UI states which rule applies.
- Reviewer, Viewer, Guest, and Core seat classes are separate when configured.
- Current product behavior counts all memberships equally, so the local screen labels differentiated seat allocation as a target contract only.
- Seat limit failure keeps invitation content and allows an authorized user to review billing or release an unused seat.
- Removing access does not erase the person's historical actions.

## 9. Selected information architecture candidates

### 01 — Directory ledger

Dense people and invitation table, strong for scanning and bulk operations. Weak for understanding one person's effective access and removal consequences.

### 02 — Access dossier

Master-detail composition with searchable directory on the left and one person's role, scope, effective capabilities, assignments, provisioning, and risk state on the right. On mobile it becomes directory first and a full-page person detail with a Back action.

### 03 — Team map

People grouped under Entity/team and Program scope. Strong once scoped membership exists, but it could imply a hierarchy the current schema does not yet store.

After validating the local fixtures and responsive behavior, **02 — Access dossier** is selected. It preserves the directory speed of Option 01 and uses the scoped grouping of Option 03 without presenting unimplemented scope records as current truth. All three remain available in the comparison switcher.

## 10. Required states and adversarial fixtures

1. healthy multi-role Organization;
2. one Owner only;
3. two Owners;
4. current user is sole Owner;
5. Admin attempts to assign Owner;
6. Owner transfer awaiting acceptance;
7. current user edits their own role;
8. Program Manager restricted to one Program;
9. same person with different roles across scopes;
10. Reviewer with only assigned-round access;
11. Reviewer with unfinished assignments at removal;
12. Finance projection;
13. Legal projection;
14. Viewer read-only projection;
15. Guest access expiring today;
16. expired Guest access;
17. legacy `member` role;
18. pending invitation;
19. invitation accepted elsewhere while open;
20. invitation expired;
21. invitation revoked;
22. invitation email bounced;
23. duplicate invitation;
24. invitee has no Missa account under the current implementation;
25. seat limit reached;
26. seat count changes concurrently;
27. SCIM-managed person;
28. suspended account;
29. deprovisioned account with preserved history;
30. missing display name;
31. very long name and email;
32. international and diacritic names;
33. 1,000+ memberships;
34. no search results;
35. empty Organization bootstrap;
36. permission denied;
37. mutation pending;
38. mutation failed;
39. stale role edit;
40. offline before save;
41. reassignment required;
42. no eligible ownership transferee;
43. keyboard-only dialog and row navigation;
44. focus restoration after close/cancel/success;
45. 320, 390, 768, 1280, and 1536 pixel viewports;
46. 200% and 400% zoom.

## 11. Premium Shadcn Studio anatomy

| Job | Premium anatomy | Missa adaptation |
| --- | --- | --- |
| People directory | `data-table/data-table-04` desktop; `list/list-03` mobile | Name, email, access state, role, scope, seat, and one named Open action |
| Identity | `avatar/avatar-03`; grouped context from `avatar/avatar-20` | Initial fallback is always available; presence dots are rejected because online presence is not modeled |
| Selected access dossier | `card/card-07` and `separator/separator-01` | Role, scope, capabilities, assignments, provisioning, and safeguards remain readable together |
| Search and filters | `input/input-14`, `select/select-01`, `popover/popover-01` | Persistent labels and independent filters; URL-backed before product promotion |
| Person and scope choice | `combobox/combobox-08` and `combobox/combobox-01` | Searchable people and resource choices with identity and scope explanation |
| Invite and edit | `dialog/dialog-06` sticky-footer anatomy; `form/form-06` | Review effective access before committing; mobile may use a full-page sheet |
| Removal and ownership | `alert-dialog/alert-dialog-01` behavior and `dialog/dialog-06` for reassignment | Named consequences, typed confirmation only when proportionate, focus restoration, no browser confirm |
| Mobile dossier | `sheet/sheet-04` translated to a full-page list/detail route | Directory first, person second, Back restores row focus |
| Status and roles | `badge/badge-04`; `alert/alert-17`–`alert-20` | Plain language plus text/icon; no color-only state or implied online presence |
| Loading, empty, error | `skeleton/skeleton-11`, `alert/alert-18`–`alert-20` | Geometry-matched loading, explicit denial, retry, and preserved draft input |

## 12. Product promotion gates

Promotion is blocked until:

- real invitation records and token lifecycle exist;
- role bundles map to versioned server capabilities;
- scope assignments exist as first-class records;
- last-Owner and ownership-transfer invariants are enforced transactionally;
- reassignment dependencies are queryable;
- seat classes and invitation reservation rules match billing;
- SCIM/SSO ownership and local-edit boundaries are explicit;
- audit records include before, after, scope, actor, subject, and reason;
- optimistic concurrency prevents stale overwrites;
- URL-backed search/filter/detail state and large-directory pagination exist;
- dialog/sheet focus, keyboard, screen-reader, phone, tablet, zoom, failure, and rollback QA pass;
- the user explicitly approves product integration.

## 13. Local implementation boundary

The route deliberately describes destination visibility as a current local projection—not a capability registry. It detects the sole-Owner state separately even though the compatibility mutation does not. Invitation lifecycle, scoped roles, differentiated seats, SCIM edit ownership, session/MFA state, assignment reassignment, concurrency, and ownership transfer remain unavailable and visibly named.
