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
