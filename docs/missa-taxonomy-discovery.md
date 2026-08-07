# Taxonomy-driven opportunity research

Missa does not treat the taxonomy as display metadata. It is the control plane
for source coverage and research.

The coverage lane materializes cells from:

```text
canonical taxonomy term × opportunity type × geography × language × source tier
```

Each gap produces bounded, locale-aware queries in
`source_discovery_queries`. The taxonomy discovery lane claims due queries,
sends them to an approved search provider, and writes only reviewable rows to
`source_discovery_candidates`.

The provider receives the canonical term IDs, labels, and facets in `context`.
That means a query for `Poetry` and `grant` in `NG` is distinguishable from a
query for `Photography` and `residency` in `CA`, even when the human query
strings look similar. Geography, eligibility, fees, and source tier remain
separate axes; an eligibility phrase never becomes a creative-practice term.

## Safety boundary

Discovery results are candidates, not opportunities and not sources. The lane:

- normalizes and deduplicates HTTP(S) URLs;
- preserves title, snippet, score, and provider policy preflight;
- marks globally repeated URLs as `duplicate`;
- marks robots/terms-blocked results as `blocked`;
- advances the query cursor and applies bounded failure backoff;
- never creates a `radar_sources` row or publishes an opportunity.

Review and promotion must fetch the authoritative organisation/call page,
check robots.txt and terms, capture evidence, resolve taxonomy assignments, and
then attach an approved source to the relevant coverage cell.

## Runtime contract

Configure the Railway worker with `DATABASE_URL` and either
`SERPER_API_KEY` or `MISSA_TAXONOMY_DISCOVERY_ENDPOINT`; optionally set
`MISSA_TAXONOMY_DISCOVERY_TOKEN`, `MISSA_TAXONOMY_DISCOVERY_BATCH_SIZE`,
`MISSA_TAXONOMY_DISCOVERY_RESULT_LIMIT`, and
`MISSA_TAXONOMY_DISCOVERY_INTERVAL_MINUTES`. The Vercel cron invokes one
bounded tick as a fallback. Without an endpoint, it returns `unavailable`
without consuming queued queries, so installing the lane cannot create fake
coverage.
