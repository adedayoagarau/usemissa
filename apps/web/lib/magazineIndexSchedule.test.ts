import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cronAuthorized,
  magazineIndexAutoPublish,
} from "./magazineIndexSchedule";

test("the scheduled update publishes only when explicitly enabled", () => {
  assert.equal(magazineIndexAutoPublish({}), false);
  assert.equal(
    magazineIndexAutoPublish({ MISSA_RANKINGS_AUTO_PUBLISH: "true" }),
    false,
  );
  assert.equal(
    magazineIndexAutoPublish({ MISSA_RANKINGS_AUTO_PUBLISH: "1" }),
    true,
  );
});

test("the cron route accepts only the configured secret", () => {
  const request = (headers: Record<string, string>, query = "") =>
    new Request(`https://usemissa.com/api/cron/magazine-rankings${query}`, {
      headers,
    });
  assert.equal(
    cronAuthorized(request({ authorization: "Bearer s3cret" }), "s3cret"),
    true,
  );
  assert.equal(cronAuthorized(request({}, "?secret=s3cret"), "s3cret"), true);
  assert.equal(
    cronAuthorized(request({ authorization: "Bearer wrong" }), "s3cret"),
    false,
  );
  assert.equal(
    cronAuthorized(request({ authorization: "Bearer " }), undefined),
    false,
  );
});
