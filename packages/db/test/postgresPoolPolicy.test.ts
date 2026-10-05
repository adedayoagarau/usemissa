import assert from "node:assert/strict";
import test from "node:test";
import {
  missaPostgresPoolConfig,
  normalizePostgresConnectionString,
} from "../src/postgresPoolPolicy.js";

test("normalizes weaker sslmode=require to verify-full", () => {
  assert.equal(
    normalizePostgresConnectionString(
      "postgresql://u:p@host/db?sslmode=require&channel_binding=require",
    ),
    "postgresql://u:p@host/db?sslmode=verify-full&channel_binding=require",
  );
});

test("leaves an already-strong or absent sslmode untouched", () => {
  assert.equal(
    normalizePostgresConnectionString(
      "postgresql://u:p@host/db?sslmode=verify-full&channel_binding=require",
    ),
    "postgresql://u:p@host/db?sslmode=verify-full&channel_binding=require",
  );
  assert.equal(
    normalizePostgresConnectionString("postgresql://u:p@host/db"),
    "postgresql://u:p@host/db",
  );
});

test("trims a trailing env-file newline before handing the string to pg", () => {
  assert.equal(
    normalizePostgresConnectionString(
      "postgresql://u:p@host/db?sslmode=require&channel_binding=require\n",
    ),
    "postgresql://u:p@host/db?sslmode=verify-full&channel_binding=require",
  );
});

test("pool config applies the TLS normalization to its connection string", () => {
  const config = missaPostgresPoolConfig(
    "postgresql://u:p@host/db?sslmode=require",
    "creator",
    {},
  );
  assert.equal(
    config.connectionString,
    "postgresql://u:p@host/db?sslmode=verify-full",
  );
});

test("on Vercel a pool times out instead of waiting forever; elsewhere it keeps pg's defaults", () => {
  const saved = { VERCEL: process.env.VERCEL, MISSA_DB_CONNECTION_TIMEOUT_MS: process.env.MISSA_DB_CONNECTION_TIMEOUT_MS, MISSA_DB_QUERY_TIMEOUT_MS: process.env.MISSA_DB_QUERY_TIMEOUT_MS };
  try {
    delete process.env.MISSA_DB_CONNECTION_TIMEOUT_MS;
    delete process.env.MISSA_DB_QUERY_TIMEOUT_MS;

    delete process.env.VERCEL;
    const worker = missaPostgresPoolConfig("postgresql://u:p@host/db", "catalogue", { max: 4, query_timeout: 20_000 });
    assert.equal(worker.connectionTimeoutMillis, undefined);
    assert.equal(worker.query_timeout, undefined);
    assert.equal(worker.max, 4);

    process.env.VERCEL = "1";
    const web = missaPostgresPoolConfig("postgresql://u:p@host/db", "catalogue", { max: 4, query_timeout: 20_000 });
    assert.equal(web.connectionTimeoutMillis, 10_000);
    assert.equal(web.query_timeout, 20_000);
    assert.equal(missaPostgresPoolConfig("postgresql://u:p@host/db", "creator").query_timeout, undefined);

    process.env.MISSA_DB_CONNECTION_TIMEOUT_MS = "4000";
    process.env.MISSA_DB_QUERY_TIMEOUT_MS = "9000";
    const overridden = missaPostgresPoolConfig("postgresql://u:p@host/db", "catalogue", { query_timeout: 20_000 });
    assert.equal(overridden.connectionTimeoutMillis, 4_000);
    assert.equal(overridden.query_timeout, 9_000);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
