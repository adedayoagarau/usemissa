import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_EVENT_NAMES,
  CLIENT_ANALYTICS_EVENT_NAMES,
  analyticsEventDefinition,
  validateAnalyticsEventProperties,
  validateAnalyticsProperties,
} from "./analytics-contract";

test("analytics contract separates client observations from server authority", () => {
  assert.equal(analyticsEventDefinition("public.opportunity_view")?.authority, "client");
  assert.equal(analyticsEventDefinition("discovery.opportunity_saved")?.authority, "server");
  assert.equal(analyticsEventDefinition("application.submission_marked_by_user")?.authority, "server");
  assert.ok(ANALYTICS_EVENT_NAMES.includes("workspace.export_created"));
});

test("analytics properties reject likely private content and nested payloads", () => {
  assert.match(validateAnalyticsProperties({ email: "creator@example.test" }) ?? "", /private or sensitive/u);
  assert.match(validateAnalyticsProperties({ answer_text: "private" }) ?? "", /private or sensitive/u);
  assert.match(validateAnalyticsProperties({ safe: ["not", "flat"] }) ?? "", /string, number, or boolean/u);
  assert.equal(validateAnalyticsProperties({ opportunity_id: "opp_1", result_count: 4 }), undefined);
});

test("analytics contract requires event-specific dimensions", () => {
  assert.match(validateAnalyticsEventProperties("public.opportunity_view", {}) ?? "", /opportunityId/u);
  assert.equal(validateAnalyticsEventProperties("public.opportunity_view", { opportunityId: "opp_1" }), undefined);
});

test("analytics contract rejects properties outside the event allowlist", () => {
  assert.match(
    validateAnalyticsEventProperties("public.opportunity_view", {
      opportunityId: "opp_1",
      arbitrary_label: "not planned",
    }) ?? "",
    /unregistered properties: arbitrary_label/,
  );
});

test("existing first-save and waitlist dimensions remain explicitly registered", () => {
  assert.equal(
    validateAnalyticsEventProperties("journey.intent_revalidated", {
      journey_id: "journey_1",
      transition: "intent-revalidated",
      opportunity_id: "opp_1",
      snapshot_fingerprint: "sha256-example",
      result: "current",
    }),
    undefined,
  );
  assert.equal(
    validateAnalyticsEventProperties("public.waitlist_joined", {
      waitlist: "creator",
      created: true,
      utm_source: "newsletter",
      device_class: "mobile",
    }),
    undefined,
  );
});

test("billing instrumentation events are server-authoritative and organization-scoped", () => {
  assert.equal(analyticsEventDefinition("billing.checkout_started")?.authority, "server");
  assert.equal(analyticsEventDefinition("billing.checkout_started")?.owner, "organizations");
  assert.equal(validateAnalyticsEventProperties("billing.checkout_started", { plan: "pro" }), undefined);
  assert.match(validateAnalyticsEventProperties("billing.checkout_started", {}) ?? "", /plan/u);
  assert.equal(validateAnalyticsEventProperties("billing.subscription_cancel_scheduled", {}), undefined);
});

test("billing fake-door events are client observations and reject sensitive payloads", () => {
  assert.equal(analyticsEventDefinition("billing.plan_viewed")?.authority, "client");
  assert.equal(analyticsEventDefinition("billing.plan_viewed")?.owner, "organizations");
  assert.equal(validateAnalyticsEventProperties("billing.plan_viewed", { surface: "workspace" }), undefined);
  assert.match(validateAnalyticsEventProperties("billing.plan_viewed", {}) ?? "", /surface/u);
  assert.equal(validateAnalyticsEventProperties("billing.plan_selected", { plan: "pro" }), undefined);
  assert.match(validateAnalyticsEventProperties("billing.plan_selected", {}) ?? "", /plan/u);
  assert.ok(CLIENT_ANALYTICS_EVENT_NAMES.includes("billing.plan_viewed"));
  assert.ok(CLIENT_ANALYTICS_EVENT_NAMES.includes("billing.plan_selected"));
});
