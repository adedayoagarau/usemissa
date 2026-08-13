# Ingestion v2 shadow benchmark

## Decision for the first comparison

The first slice is global in product intent but deliberately narrow in source
scope:

- literary opportunities from Poets & Writers;
- cross-disciplinary creative opportunities from NYFA (monitored, but currently blocked by source-side 403 responses);
- US arts grants from the official Grants.gov API;
- grants and fellowships from Creative Capital.

This gives the comparison three useful page shapes without pretending that the
first run proves global coverage:

| Source | Role in benchmark | First adapter |
| --- | --- | --- |
| Poets & Writers | Gary's existing evidence-rich baseline | Gary bridge + generic v2 page adapter |
| NYFA Opportunities | blocked-source monitoring | generic v2 page adapter |
| Grants.gov Arts API | POST JSON listing plus POST detail destination | request-aware JSON API adapter |
| Creative Capital | official opportunity page behavior | generic v2 page adapter |

The first pass is shadow-only. It does not publish, update, or delete public
Radar records.

The comparator executes the same classified-detail fanout as the worker. For
Gary comparisons it resolves the latest observed Gary detail URL first, then
compares v2 and Gary against that same destination; a listing page alone is not
treated as an opportunity record.

NYFA remains in the source registry so access failures are observable and can be
retested if the publisher provides an approved feed or API. It is not allowed to
hold the heterogeneous-source benchmark hostage while its public pages return
403. Grants.gov is the active API-shape replacement: its search request and
opportunity detail request are both explicit POST contracts, and both remain
shadow-only here.

## Environments

### Local

Start Redis without creating an external account:

```bash
docker compose -f docker-compose.ingestion-v2.yml up -d
export REDIS_URL=redis://localhost:6379
```

Use a disposable local or Neon branch database for durable artifacts:

```bash
export DATABASE_URL='postgresql://...disposable-branch...'
npm run schema:ensure --workspace=@missa/ingestion-v2
```

### Hosted shadow worker

Use a dedicated Railway service with:

- the staging Neon `DATABASE_URL`;
- the Upstash native TLS `REDIS_URL`;
- no production publication credentials or public promotion flag.

Deploy it from the repository root using
`docker/ingestion-v2/Dockerfile`. Its only required runtime variables are:

- `DATABASE_URL`: the dedicated staging Neon branch;
- `REDIS_URL`: the native TLS Upstash Redis URL.

Keep the service private and do not attach it to the public web service.

The dedicated worker image is standalone rather than the repository-wide
web/Radar image. Its production dependency audit currently reports zero known
moderate, high, or critical vulnerabilities for the runtime dependency set.

Run the worker:

```bash
npm run build --workspace=@missa/ingestion-v2
node packages/ingestion-v2/dist/src/worker.js
```

Queue a run from a second process:

```bash
V2_SOURCE_ID=benchmark-pw-grants \
node packages/ingestion-v2/dist/src/run-cli.js
```

Run the first Gary-v2 comparison separately:

```bash
DATABASE_URL="...staging Neon branch..." \
  node packages/ingestion-v2/dist/src/compare-cli.js
```

## Acceptance gates

The staging smoke test is successful only when:

1. one run appears as queued and then completed;
2. one snapshot and extracted fields are durable in the v2 tables;
3. a failed fetch creates a failed run with an error;
4. the Gary comparison report is available for the same source;
5. Radar public opportunity counts are unchanged;
6. no v2 artifact has `published = true`.

Promotion remains fail-closed until source health is healthy, an authoritative
destination is reached, baseline field recall and normalized agreement are at
least 0.8, evidence is review-quality, identity is not duplicate or ambiguous,
and no critical warning is present. This gate only authorizes review readiness;
it does not perform a public write.
