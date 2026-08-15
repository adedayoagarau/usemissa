# Opportunity provenance and destination policy

This is a publication rule, not a copy preference.

## The source graph

Every opportunity has two different URL roles:

- `source.url` is discovery and evidence. It tells us where Missa found or verified the listing.
- `fields.guidelinesUrl` / the official destination is the first-party program or application page users should visit.

A directory, aggregator, newsletter, or competitor may be retained as evidence, but it must not become the public “Official source” when a first-party destination exists.

## Five publication rules

1. Resolve the host organization from the opportunity page and linked first-party context. Do not use the directory name as the organization.
2. Resolve and store a first-party destination separately from the discovery source. The public CTA must use that destination.
3. Classify the opportunity from what the host is offering. A residency program is a `residency`; generic repost language such as “contest” does not override it.
4. If the destination cannot be reconciled to the host, keep the record reviewable and do not publish it as production-ready.
5. Preserve discovery provenance internally for audit and evidence, but do not send public traffic to a competitor or imply that a directory runs the opportunity.

## LLM boundary

DeepSeek may propose the organization, type, and official destination from page evidence. Deterministic validation and the publication rubric decide whether those proposals can enter the canonical record. The model may never turn an unverified directory URL into an official destination merely because it is the page it read.
