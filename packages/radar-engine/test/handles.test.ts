import assert from "node:assert/strict";
import test from "node:test";
import {
  DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD,
  deriveDirectoryHandleCandidates,
  deriveDomainHandleCandidates,
  deriveNameHandleCandidates,
  inspectHandleNormalization,
  normalizeHandle,
  planDirectoryProfileMerge,
  planDirectoryReservation,
  proposeIdentityConfidenceThreshold,
  registrableDomainLabel,
} from "../src/handles/handles.js";
import {
  HANDLE_CLAIM_INVITEE_WINDOW_DAYS,
  HANDLE_DELETION_HOLD_DAYS,
  HANDLE_MEANINGFUL_TRAFFIC_PAGEVIEWS,
  handleReleaseDecision,
  inviteeClaimWindowOpen,
  renameAllowed,
} from "../src/handles/policy.js";

test("normalizes case, diacritics, ampersands, and apostrophes deterministically", () => {
  assert.equal(normalizeHandle("Writer's & Café"), "writers-and-cafe");
  assert.equal(normalizeHandle("The Paris Review"), "the-paris-review");
  assert.equal(normalizeHandle("Writer--Review"), null);
  assert.equal(normalizeHandle("123 Writers"), null);
});

test("rejects mixed-script confusables before folding", () => {
  const inspection = inspectHandleNormalization("Grаnta");
  assert.equal(inspection.valid, false);
  assert.equal(inspection.reason, "mixed-script");
  assert.equal(normalizeHandle("Grаnta"), null);
});

test("emits the stripped and retained leading-article candidates", () => {
  // Current Gary fixture: The Common.
  assert.deepEqual(deriveNameHandleCandidates("The Common"), {
    canonical: "common",
    articleVariant: "thecommon",
    values: ["common", "thecommon"],
  });
  assert.deepEqual(
    deriveDomainHandleCandidates("https://www.theparisreview.org"),
    {
      candidates: {
        canonical: "parisreview",
        articleVariant: "theparisreview",
        values: ["parisreview", "theparisreview"],
      },
      inspection: {
        input: "theparisreview",
        normalized: "theparisreview",
        valid: true,
        containsDiacritics: false,
        containsNonLatinScript: false,
        containsNonAsciiLetters: false,
        mixedScript: false,
      },
      label: "theparisreview",
    },
  );
  assert.equal(
    registrableDomainLabel("https://www.example.co.uk/path"),
    "example",
  );
  assert.equal(
    registrableDomainLabel("https://journal.substack.com/guidelines"),
    "substack",
  );
});

test("requires a website and agreement before auto-minting a directory handle", () => {
  const profile = {
    name: "The Paris Review",
    normalizedWebsiteUrl: "https://theparisreview.org",
    identityStatus: "confirmed",
    identityConfidence: "0.950",
  };
  const plan = planDirectoryReservation(profile);
  assert.equal(plan.decision, "auto-mint");
  assert.equal(plan.handleKey, "parisreview");
  assert.deepEqual(plan.aliasKeys, ["theparisreview"]);
  assert.equal(plan.derivation, "both");

  const noWebsite = planDirectoryReservation({
    ...profile,
    normalizedWebsiteUrl: null,
  });
  assert.equal(noWebsite.decision, "review");
  assert.match(noWebsite.reason, /no-normalized-website-url/);

  const disagreeing = planDirectoryReservation({
    ...profile,
    name: "The Paris Review",
    normalizedWebsiteUrl: "https://unrelated.example",
  });
  assert.equal(disagreeing.decision, "review");
  assert.match(disagreeing.reason, /name-domain-disagree/);
});

test("routes low-confidence, needs-review, diacritic, common-word, collision, and held keys to review", () => {
  const base = {
    name: "The Paris Review",
    normalizedWebsiteUrl: "https://theparisreview.org",
    identityStatus: "confirmed",
    identityConfidence: 0.95,
  };
  assert.equal(
    planDirectoryReservation({ ...base, identityStatus: "needs-review" })
      .decision,
    "review",
  );
  assert.equal(
    planDirectoryReservation({ ...base, identityConfidence: 0.79 }).decision,
    "review",
  );
  assert.equal(
    planDirectoryReservation({
      ...base,
      name: "Café Review",
      normalizedWebsiteUrl: "https://cafe-review.org",
    }).decision,
    "review",
  );
  assert.equal(
    planDirectoryReservation({
      ...base,
      name: "Grain",
      normalizedWebsiteUrl: "https://grain.org",
    }).decision,
    "review",
  );
  assert.equal(
    planDirectoryReservation(base, { collidingKeys: new Set(["parisreview"]) })
      .decision,
    "review",
  );
  assert.equal(
    planDirectoryReservation(base, { occupiedKeys: new Set(["parisreview"]) })
      .decision,
    "review",
  );
});

test("covers real Gary fixture names for ampersands, diacritics, missing websites, and duplicates", () => {
  // These names and website states were read from gary_profiles for the
  // Phase 1 plan; the planner remains pure and does not query the database.
  const ampersand = deriveNameHandleCandidates("Down & Out Books");
  assert.ok(ampersand);
  assert.match(ampersand.values[0]!, /and/);

  const diacritic = deriveDirectoryHandleCandidates({
    name: "Arte Público Press",
    normalizedWebsiteUrl: "https://artepublicopress.com",
  });
  assert.equal(diacritic.nameInspection.containsDiacritics, true);
  assert.equal(
    planDirectoryReservation({
      name: "Arte Público Press",
      normalizedWebsiteUrl: "https://artepublicopress.com",
      identityStatus: "confirmed",
      identityConfidence: 0.95,
    }).decision,
    "review",
  );

  assert.equal(
    planDirectoryReservation({
      name: "A Public Space",
      normalizedWebsiteUrl: null,
      identityStatus: "confirmed",
      identityConfidence: 0.95,
    }).decision,
    "review",
  );

  const duplicateProfile = {
    name: "BOMB Magazine",
    normalizedWebsiteUrl: "https://bombmagazine.org",
    identityStatus: "confirmed",
    identityConfidence: 0.95,
  };
  assert.equal(
    planDirectoryReservation(duplicateProfile, {
      collidingKeys: new Set(["bombmagazine"]),
    }).decision,
    "review",
  );

  // Fictional Café exists in the table; this fixture exercises the state a
  // later crawl may set even though the current snapshot has no such rows.
  assert.equal(
    planDirectoryReservation({
      name: "Fictional Café",
      normalizedWebsiteUrl: "https://fictionalcafe.com",
      identityStatus: "needs-review",
      identityConfidence: 0.95,
    }).decision,
    "review",
  );
});

test("blocks a route or authority word without exposing a different derivation", () => {
  const plan = planDirectoryReservation({
    name: "Admin",
    normalizedWebsiteUrl: "https://admin.org",
    identityStatus: "confirmed",
    identityConfidence: 0.95,
  });
  assert.equal(plan.decision, "blocked");
  assert.match(plan.reason, /reserved-word/);
});

test("preserves a reservation on profile merge by aliasing the merged handle", () => {
  assert.deepEqual(
    planDirectoryProfileMerge({
      survivingHandleKey: "parisreview",
      mergedHandleKey: "theparisreview",
    }),
    {
      keepHandleKey: "parisreview",
      aliases: [
        {
          aliasKey: "theparisreview",
          handleKey: "parisreview",
          reason: "manual",
        },
      ],
    },
  );
});

test("proposes a conservative confidence threshold from the observed distribution", () => {
  assert.equal(DIRECTORY_IDENTITY_CONFIDENCE_THRESHOLD, 0.8);
  assert.equal(proposeIdentityConfidenceThreshold([0.95, "0.9", null]), 0.9);
  assert.equal(proposeIdentityConfidenceThreshold([0.7, 0.95]), 0.8);
  assert.equal(proposeIdentityConfidenceThreshold([]), 0.8);
});

test("does not derive a user handle from an email address", () => {
  assert.equal(
    normalizeHandle("adedayoagarau@example.com"),
    "adedayoagarau-example-com",
  );
  assert.notEqual(
    normalizeHandle("adedayoagarau@example.com"),
    "adedayoagarau",
  );
});

test("invite, rename, and deletion lifecycle constants are explicit", () => {
  const redeemedAt = new Date("2026-08-01T00:00:00.000Z");
  assert.equal(HANDLE_CLAIM_INVITEE_WINDOW_DAYS, 14);
  assert.equal(
    inviteeClaimWindowOpen({
      redeemedAt,
      now: new Date("2026-08-14T23:59:59.000Z"),
    }),
    true,
  );
  assert.equal(
    inviteeClaimWindowOpen({
      redeemedAt,
      now: new Date("2026-08-15T00:00:00.000Z"),
    }),
    false,
  );
  assert.equal(
    renameAllowed({
      lastRenamedAt: new Date("2026-08-01T00:00:00.000Z"),
      now: new Date("2026-08-30T00:00:00.000Z"),
    }),
    false,
  );
  assert.equal(HANDLE_DELETION_HOLD_DAYS, 90);
  assert.equal(HANDLE_MEANINGFUL_TRAFFIC_PAGEVIEWS, 100);
  assert.equal(
    handleReleaseDecision({
      deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      now: new Date("2026-04-02T00:00:00.000Z"),
      publicPageViews: 100,
    }),
    "never-release",
  );
  assert.equal(
    handleReleaseDecision({
      deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      now: new Date("2026-04-02T00:00:00.000Z"),
      publicPageViews: 0,
    }),
    "eligible",
  );
});
