import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCountry, countryNameFromCode } from "@missa/contracts";
import { PostgresProfileRepository } from "../src/profileRepository.js";

test("normalizeCountry parses common country names, codes, and worldwide variations", () => {
  assert.deepEqual(normalizeCountry("US"), {
    countryCode: "US",
    country: "United States",
  });
  assert.deepEqual(normalizeCountry("usa"), {
    countryCode: "US",
    country: "United States",
  });
  assert.deepEqual(normalizeCountry("United Kingdom"), {
    countryCode: "GB",
    country: "United Kingdom",
  });
  assert.deepEqual(normalizeCountry("uk"), {
    countryCode: "GB",
    country: "United Kingdom",
  });
  assert.deepEqual(normalizeCountry("Nigeria"), {
    countryCode: "NG",
    country: "Nigeria",
  });
  assert.deepEqual(normalizeCountry("Canada"), {
    countryCode: "CA",
    country: "Canada",
  });
  assert.deepEqual(normalizeCountry("global"), {
    countryCode: "GLOBAL",
    country: "Worldwide",
  });
  assert.deepEqual(normalizeCountry("Worldwide"), {
    countryCode: "GLOBAL",
    country: "Worldwide",
  });
  assert.equal(countryNameFromCode("CA"), "Canada");
  assert.equal(countryNameFromCode("NG"), "Nigeria");
  assert.equal(countryNameFromCode("GLOBAL"), "Worldwide");
});

test("PostgresProfileRepository browse keeps additive-schema country compatibility", async () => {
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
  assert.match(queryObj.text, /profile_rank = 1/);
  assert.match(queryObj.text, /ro\.data->>'country'/);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].countryCode, "NG");
  assert.equal(result.items[0].country, "Nigeria");
  assert.equal(result.items[0].city, "Lagos");
});

test("PostgresProfileRepository countryCounts performs one aggregate query", async () => {
  const capturedQueries: Array<{ text: string; values: unknown[] }> = [];
  const mockPool = {
    query: async (query: { text: string; values: unknown[] }) => {
      capturedQueries.push(query);
      return {
        rows: [
          {
            country_code: "NG",
            country: "Nigeria",
            org_country: null,
            profile_count: 7,
          },
          {
            country_code: null,
            country: null,
            org_country: "Nigeria",
            profile_count: "2",
          },
          {
            country_code: "US",
            country: "United States",
            org_country: null,
            profile_count: 4,
          },
          {
            country_code: "GLOBAL",
            country: "Worldwide",
            org_country: null,
            profile_count: 3,
          },
          {
            country_code: "NY",
            country: null,
            org_country: null,
            profile_count: 5,
          },
        ],
      };
    },
  } as any;

  const result = await new PostgresProfileRepository(mockPool).countryCounts();

  assert.equal(capturedQueries.length, 1);
  assert.match(
    capturedQueries[0].text,
    /GROUP BY[\s\S]*to_jsonb\(p\)->>'country_code'/,
  );
  assert.match(capturedQueries[0].text, /count\(\*\)::int AS profile_count/);
  assert.doesNotMatch(capturedQueries[0].text, /LIMIT|OFFSET/);
  assert.deepEqual(result, [
    { countryCode: "NG", count: 9 },
    { countryCode: "US", count: 4 },
  ]);
});

test("PostgresProfileRepository findByNames batches exact names into one query", async () => {
  const capturedQueries: Array<{ text: string; values: unknown[] }> = [];
  const mockPool = {
    query: async (query: { text: string; values: unknown[] }) => {
      capturedQueries.push(query);
      return {
        rows: [
          {
            id: "prof_001",
            profile_kind: "literary_magazine",
            name: "The Paris Review",
            country_code: "US",
            country: "United States",
            city: "New York",
          },
          {
            id: "prof_002",
            profile_kind: "literary_magazine",
            name: "Granta",
            country_code: "GB",
            country: "United Kingdom",
            city: "London",
          },
        ],
      };
    },
  } as any;

  const result = await new PostgresProfileRepository(mockPool).findByNames([
    "The Paris Review",
    "Granta",
    "  Granta  ",
  ]);

  assert.equal(capturedQueries.length, 1);
  assert.match(
    capturedQueries[0].text,
    /lower\(p\.name\) = ANY\(\$1::text\[\]\)/,
  );
  assert.deepEqual(capturedQueries[0].values, [["the paris review", "granta"]]);
  assert.deepEqual(
    result.map((profile) => profile.name),
    ["The Paris Review", "Granta"],
  );
});
