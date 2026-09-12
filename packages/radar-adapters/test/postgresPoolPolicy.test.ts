import assert from "node:assert/strict";
import test from "node:test";
import { missaPostgresPoolConfig } from "../src/postgresPoolPolicy.js";

const policyKeys = [
  "MISSA_CREATOR_POOL_MAX",
  "MISSA_CATALOGUE_POOL_MAX",
  "MISSA_DB_CONNECTION_TIMEOUT_MS",
  "MISSA_DB_IDLE_TIMEOUT_MS",
] as const;

test("pool policy preserves defaults when no hardening overrides are configured", () => {
  const previous = Object.fromEntries(policyKeys.map((key) => [key, process.env[key]]));
  try {
    for (const key of policyKeys) delete process.env[key];
    assert.deepEqual(missaPostgresPoolConfig("postgres://example", "creator", { max: 10 }), {
      connectionString: "postgres://example",
      max: 10,
    });
  } finally {
    for (const key of policyKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("pool policy applies role-specific and shared positive overrides", () => {
  const previous = Object.fromEntries(policyKeys.map((key) => [key, process.env[key]]));
  try {
    process.env.MISSA_CREATOR_POOL_MAX = "4";
    process.env.MISSA_DB_CONNECTION_TIMEOUT_MS = "3000";
    process.env.MISSA_DB_IDLE_TIMEOUT_MS = "10000";
    assert.deepEqual(missaPostgresPoolConfig("postgres://example", "creator", { max: 10 }), {
      connectionString: "postgres://example",
      max: 4,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
    });
  } finally {
    for (const key of policyKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("pool policy ignores malformed or non-positive overrides", () => {
  const previous = process.env.MISSA_CREATOR_POOL_MAX;
  try {
    process.env.MISSA_CREATOR_POOL_MAX = "0";
    assert.deepEqual(missaPostgresPoolConfig("postgres://example", "creator", { max: 10 }), {
      connectionString: "postgres://example",
      max: 10,
    });
  } finally {
    if (previous === undefined) delete process.env.MISSA_CREATOR_POOL_MAX;
    else process.env.MISSA_CREATOR_POOL_MAX = previous;
  }
});
