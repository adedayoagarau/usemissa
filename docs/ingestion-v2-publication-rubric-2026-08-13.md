# Ingestion v2 publication rubric

## Publication boundary

The canonical writer targets the relational `opportunities` record and its related evidence/content tables. A record becomes visible to public discovery only when `opportunities.publication_state = 'published'`. `radar_opportunities` remains a compatibility projection and must not be used as the v2 writer's public destination.

The writer is idempotent, source-first, and append-aware:

- source evidence remains attached to the opportunity;
- the latest reconciled snapshot becomes the version baseline;
- content is stored separately in `opportunity_contents`;
- `reviewable` is the default write state;
- only a passed publication decision may transition `reviewable` to `published`;
- every retry uses a stable source/opportunity identity and input version.

## Five gates

Every candidate must pass all five gates. DeepSeek may interpret evidence and propose a decision, but it cannot override a deterministic hard failure.

### 1. Authority and destination

Pass only when:

- the canonical source URL is present and fetchable;
- the source page links to an authoritative detail, guidelines, or application destination;
- the destination was fetched successfully;
- the destination belongs to the same organization or publisher context;
- the destination URL is HTTPS and not unsafe, deceptive, or unrelated.

Hard failures: missing source, missing authoritative destination, unsafe link, destination mismatch.

### 2. Identity and deduplication

Pass only when:

- title and organization are meaningful values, not placeholders;
- the source and destination reconcile by canonical URL or matching title/organization;
- the candidate does not duplicate an existing canonical opportunity;
- an ambiguous identity is sent to review rather than merged automatically.

Hard failures: unidentifiable record, confirmed duplicate, or conflicting identity that cannot be resolved.

### 3. Freshness and opening state

Pass only when:

- the successful fetch timestamp is recorded;
- the opening window, deadline, or rolling status is represented honestly;
- stale or closed records are not presented as open;
- an explicit future opening window is allowed to remain scheduled without being published as currently open.

Unknown is acceptable when it is displayed as unknown; invented dates are never acceptable.

### 4. Useful completeness and provenance

Pass only when the page can answer the creator's next decision:

- what is this;
- who is it for;
- when is it open or due;
- what does it cost or offer;
- where are the official guidelines or application path;
- what materials or eligibility constraints are known.

Every displayed fact must retain its source URL and certainty. Missing fields remain explicitly unknown.

### 5. Safety, editorial quality, and content integrity

Pass only when:

- no critical fetch, robots, model, or parsing warning remains unresolved;
- generated copy stays within the evidence;
- no unsupported winners, participant history, acceptance rates, or promotional claims are added;
- media and historical examples have explicit source and rights status;
- the content is concise, accessible, and does not imply Missa endorsement.

DeepSeek can recommend `approve`, `review`, or `reject`; deterministic hard failures always win.

## Content contract

The first public page should be an opportunity brief, not an essay:

1. title and organization;
2. one-sentence summary;
3. deadline or opening window;
4. fee and prize/support, when confirmed;
5. eligibility and required materials;
6. official guidelines/application action;
7. source and last verified timestamp;
8. literal unknowns and a short “check the official source” caveat.

Past winners are useful only as a separate, clearly labelled enrichment block when an official winners page exists and each item has its own source link. People the organization has published should not be added to an opportunity page by inference; they belong on an organization/profile page and require separate evidence and rights checks.

## Decision states

- `reviewable`: written to the canonical database but not public;
- `published`: all five gates passed and the publication decision is recorded;
- `needs-human`: evidence exists but one or more gates require a person;
- `suppressed`: duplicate, unsafe, stale beyond policy, or contradicted by source evidence.

The next implementation is the idempotent writer: reconcile identity, upsert the canonical opportunity and evidence, upsert the content brief, enqueue enrichment only for approved evidence, and transition publication state in the same guarded transaction.
