import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCountry, countryNameFromCode } from "@missa/contracts";
import { PostgresProfileRepository } from "../src/profileRepository.js";

test("normalizeCountry parses common country names, codes, and worldwide variations", () => {
  assert.deepEqual(normalizeCountry("US"), { countryCode: "US", country: "United States" });
  assert.deepEqual(normalizeCountry("usa"), { countryCode: "US", country: "United States" });
  assert.deepEqual(normalizeCountry("United Kingdom"), { countryCode: "GB", country: "United Kingdom" });
  assert.deepEqual(normalizeCountry("uk"), { countryCode: "GB", country: "United Kingdom" });
  assert.deepEqual(normalizeCountry("Nigeria"), { countryCode: "NG", country: "Nigeria" });
  assert.deepEqual(normalizeCountry("Canada"), { countryCode: "CA", country: "Canada" });
  assert.deepEqual(normalizeCountry("global"), { countryCode: "GLOBAL", country: "Worldwide" });
  assert.deepEqual(normalizeCountry("Worldwide"), { countryCode: "GLOBAL", country: "Worldwide" });
  assert.equal(countryNameFromCode("CA"), "Canada");
  assert.equal(countryNameFromCode("NG"), "Nigeria");
  assert.equal(countryNameFromCode("GLOBAL"), "Worldwide");
});

test("PostgresProfileRepository browse incorporates country filtering and selects country columns", async () => {
  let capturedQuery: { text: string; values: unknown[] } | null = null;
  const mockPool = {
    query: async (q: { text: string; values: unknown[] }) => {
      capturedQuery = q;
      return {
        rows: [
          {
            id: "prof_001",
            profile_kind: "literary_magazine",
            name: "The Lagos Review",
            website_url: "https://thelagosreview.ng",
            country_code: "NG",
            country: "Nigeria",
            city: "Lagos",
            source_summary: "Review of literature and arts",
            genres_json: ["poetry", "fiction"],
            formats_json: ["digital"],
            reading_period: "Open year-round",
            total_count: "1",
          },
        ],
      };
    },
  } as any;

  const repo = new PostgresProfileRepository(mockPool);
  const result = await repo.browse({ country: "Nigeria" });

  assert.ok(capturedQuery);
  const queryObj = capturedQuery as { text: string; values: unknown[] };
  assert.match(queryObj.text, /to_jsonb\(p\)->>'country_code'/);
  assert.match(queryObj.text, /to_jsonb\(p\)->>'country'/);
  assert.match(queryObj.text, /ro\.data->>'country'/);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].countryCode, "NG");
  assert.equal(result.items[0].country, "Nigeria");
  assert.equal(result.items[0].city, "Lagos");
});
