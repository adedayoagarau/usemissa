# Story 11.1: Organization seats and role access

Status: review

Organization memberships are now first-class seats. Plans provide default
limits (Free 3, Indie 5, Pro 10, Program 25, Enterprise 1000), with an
organization-level override for negotiated contracts. Admins can add existing
accounts, change roles, and revoke seats while the API preserves at least one
admin/owner. Roles include Owner, Admin, Team Admin, Program Manager, Reviewer,
Finance, Legal, Viewer, Guest, plus the legacy Member role.

`/api/orgs/:id/seats` reports usage, and the Workspace People and access panel
supports role changes and removal. SSO/SCIM provisioning is intentionally a
separate provider boundary (FR52) and is not faked without an identity provider.
