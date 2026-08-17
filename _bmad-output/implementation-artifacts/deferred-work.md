# Deferred work

## First-Save focused handoff

- Add an Opportunity-version or equivalent transactional guard between revalidation and canonical Tracker creation. The current repositories do not expose a version/lock contract, and this slice does not authorize a schema migration.
- Establish a canonical dispute, removal, and safety authority in the Opportunity projection. Closed and missing records are handled locally; disputed or unsafe records cannot yet be distinguished truthfully.
- Verify Neon Auth account creation without a supplied personal name and account-without-legacy-user Tracker access against real provider and production states. Local compatibility behavior is implemented; production remains unverified.
- Define and approve durable provenance storage for the first-Save recommendation signal, including Opportunity taxonomy/source version and customer undo. The analytics event is not a recommendation-system authority.
