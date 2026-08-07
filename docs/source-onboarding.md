# Missa source onboarding

Missa has two safe source-addition paths. Neither path publishes an opportunity
by itself.

## 1. Add an approved canonical source to the registry

Use this for a known organization, official call page, journal, grant page, or
other canonical source that has already passed a robots/terms review.

1. Add the source metadata to the Radar registry under
   `packages/radar-engine/src/registry/`.
2. Include the canonical URL, source kind, tier, cadence, discipline metadata,
   geography, opportunity types, trust evidence, and whether outbound links
   may be followed.
3. Run the registry and Radar tests.
4. Deploy the release branch.

On boot, Radar reconciles registry entries into its Postgres-backed source
store. A new source is immediately due for its first fetch. The Radar worker
then fetches the page, extracts a candidate, validates it, deduplicates it, and
passes it through enrichment/review gates.

## 2. Submit a directory or feed for bounded discovery

Use this for a directory, RSS feed, or partner source that may contain links to
individual opportunities.

1. Create or queue a `source_discovery_query` tied to a coverage cell.
2. Ensure the source is explicitly marked as allowed to follow outbound links.
3. Let the research worker fetch bounded pages and create
   `source_discovery_candidates`.
4. Verify canonical URL, robots, terms, opportunity signals, and page stability.
5. Keep production promotion in `review` mode until a human approves the
   candidate.

The coverage worker can materialize coverage cells and queue these queries, but
it is not currently provisioned as a Railway service. The current repository
does not expose a public source-submission API, so this path is presently an
operator/admin workflow rather than a user-facing form.

## Guardrails

- Do not insert directly into `opportunities` to add a source.
- Do not promote navigation, archive, privacy, terms, ticket, refund, or
  generic organization pages as canonical opportunity sources.
- Do not change production promotion mode to `promote` as a shortcut.
- Keep provenance and policy evidence with every source candidate.
