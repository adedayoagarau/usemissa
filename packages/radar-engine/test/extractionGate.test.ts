import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RadarEngine,
  ManualClock,
  createStore,
  DeterministicExtractor,
  FixtureFetcher,
  type ExtractionGate,
  type PageSnapshot,
} from "../src/index.js";
import {
  MAGAZINE_PAGE_V1,
  MAGAZINE_PAGE_V2_EXTENDED,
} from "../src/fixtures/seed.js";

const URL = "https://northriverreview.org/submissions";

function world(gate?: ExtractionGate) {
  const clock = new ManualClock(new Date("2026-01-05T09:00:00Z"));
  const fetcher = new FixtureFetcher();
  const deterministic = new DeterministicExtractor(clock);
  let extractions = 0;
  const extractor = {
    extract: (
      source: Parameters<DeterministicExtractor["extract"]>[0],
      snapshot: PageSnapshot,
    ) => {
      extractions += 1;
      return deterministic.extract(source, snapshot);
    },
  };
  const engine = new RadarEngine({
    store: createStore(),
    fetcher,
    extractor,
    clock,
    ...(gate ? { extractionGate: gate } : {}),
  });
  fetcher.setPage(URL, MAGAZINE_PAGE_V1);
  engine.addSource({
    name: "North River Review",
    url: URL,
    kind: "organization-website",
    checkIntervalHours: 24,
  });
  return { engine, fetcher, clock, extractions: () => extractions };
}

async function changeAndTick(w: ReturnType<typeof world>) {
  await w.engine.tick();
  w.fetcher.setPage(URL, MAGAZINE_PAGE_V2_EXTENDED);
  w.clock.advanceDays(2);
  return w.engine.tick();
}

test("without a gate every changed page is extracted", async () => {
  const w = world();
  const report = await changeAndTick(w);
  assert.equal(w.extractions(), 2);
  assert.equal(report.opportunitiesUpdated.length, 1);
});

test("a gate sees the previous snapshot and may skip a changed page", async () => {
  const seen: Array<{ previous?: string; next: string }> = [];
  const w = world({
    shouldExtract: (_source, previous, next) => {
      seen.push({ previous: previous?.content, next: next.content });
      return previous === undefined;
    },
  });
  const report = await changeAndTick(w);
  assert.equal(w.extractions(), 1);
  assert.deepEqual(seen, [
    { previous: undefined, next: MAGAZINE_PAGE_V1 },
    { previous: MAGAZINE_PAGE_V1, next: MAGAZINE_PAGE_V2_EXTENDED },
  ]);
  assert.equal(report.opportunitiesUpdated.length, 0);
  const source = [...w.engine.store.sources.values()][0]!;
  assert.equal(source.lastContentHash, source.lastFetchedContentHash);

  // The skipped content is now the baseline: an unchanged page is not re-asked.
  w.clock.advanceDays(2);
  await w.engine.tick();
  assert.equal(seen.length, 2);
});

test("a gate that throws never blocks extraction", async () => {
  const w = world({
    shouldExtract: () => {
      throw new Error("gate down");
    },
  });
  await changeAndTick(w);
  assert.equal(w.extractions(), 2);
});
