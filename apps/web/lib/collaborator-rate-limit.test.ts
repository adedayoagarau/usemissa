import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeCollaboratorLookupRateLimit,
  resetCollaboratorLookupRateLimit,
} from "./collaborator-rate-limit";

test("handle lookups are limited per session and per address, and recover", () => {
  resetCollaboratorLookupRateLimit();
  const start = Date.UTC(2026, 9, 7, 12);
  for (let attempt = 0; attempt < 120; attempt += 1)
    assert.equal(
      consumeCollaboratorLookupRateLimit(
        { sessionKey: "one", ip: "198.51.100.1" },
        start + attempt,
      ),
      undefined,
    );
  const limited = consumeCollaboratorLookupRateLimit(
    { sessionKey: "one", ip: "198.51.100.1" },
    start + 1000,
  );
  assert.ok(limited && limited > 0, "the 121st lookup in an hour waits");

  // Another person on another address is unaffected.
  assert.equal(
    consumeCollaboratorLookupRateLimit(
      { sessionKey: "two", ip: "198.51.100.2" },
      start + 1000,
    ),
    undefined,
  );

  // An hour later the first session can look again.
  assert.equal(
    consumeCollaboratorLookupRateLimit(
      { sessionKey: "one", ip: "198.51.100.1" },
      start + 61 * 60_000,
    ),
    undefined,
  );
});

test("many sessions behind one address share its allowance", () => {
  resetCollaboratorLookupRateLimit();
  const now = Date.UTC(2026, 9, 7, 12);
  let refused = 0;
  for (let session = 0; session < 300; session += 1)
    if (
      consumeCollaboratorLookupRateLimit(
        { sessionKey: `session-${session}`, ip: "203.0.113.9" },
        now,
      )
    )
      refused += 1;
  assert.equal(refused, 60, "240 lookups per address per hour");
});
