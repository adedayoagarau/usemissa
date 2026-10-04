import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanHonoursName,
  honoursCleanupStatements,
  isHonoursMarkedName,
  planHonoursProfileCleanup,
} from "../src/ranking/live/honoursProfiles.js";
import { exactKey } from "../src/ranking/live/indexUpdate.js";
import { guidelineFacts, type MagazineGuidelineRecord } from "../src/ranking/live/guidelineFacts.js";
import { matchResidencyListings, type ResidencyProfile } from "../src/ranking/residency/recompute.js";
import { planResidencyProfiles } from "../src/ranking/residency/provision.js";
import type { AcaProgramRecord } from "../src/ranking/residency/acaDirectory.js";

test("honours-list marks come off profile names", () => {
  assert.equal(cleanHonoursName("*   Offing, The"), "The Offing");
  assert.equal(cleanHonoursName("Gettysburg Review ©"), "Gettysburg Review");
  assert.equal(cleanHonoursName("Harvard Advocate *"), "Harvard Advocate");
  assert.equal(isHonoursMarkedName("Shenandoah"), false);
  assert.equal(isHonoursMarkedName("Point, The"), true);
  assert.equal(exactKey("*Shenandoah"), exactKey("Shenandoah"));
});

test("a marked profile merges into its one real twin, else is renamed", () => {
  const profiles = [
    { id: "real", name: "Shenandoah", kind: "literary_magazine" },
    { id: "star", name: "*Shenandoah", kind: "literary_magazine" },
    { id: "closed", name: "Black Clock ©", kind: "literary_magazine" },
    { id: "closed2", name: "*Black Clock", kind: "literary_magazine" },
    { id: "a", name: "swamp pink", kind: "literary_magazine" },
    { id: "b", name: "swamp pink", kind: "literary_magazine" },
    { id: "c", name: "*swamp pink", kind: "literary_magazine" },
  ];
  const plan = planHonoursProfileCleanup(profiles, new Set(["shenandoah"]));
  assert.deepEqual(
    plan.merges.map((m) => [m.from.id, m.to.id]),
    [["closed2", "closed"], ["star", "real"]],
  );
  assert.deepEqual(plan.renames.map((r) => [r.profile.id, r.name, r.nameKey]), [["closed", "Black Clock", "black_clock"]]);
  assert.deepEqual(plan.ambiguous.map((a) => a.profile.id), ["c"]);

  const statements = honoursCleanupStatements(plan);
  // Renames run before merges, and every merge ends by removing the duplicate.
  assert.match(statements[0][0], /^UPDATE gary_profiles SET name/);
  assert.deepEqual(statements.filter(([sql]) => sql.startsWith("DELETE FROM gary_profiles")).map(([, p]) => p[0]), ["closed2", "star"]);
});

test("guideline facts map to index values and keep their pages", () => {
  const record: MagazineGuidelineRecord = {
    profileId: "p",
    name: "Colorado Review",
    checkedOn: "2026-10-03",
    fee: { charges: true, amountUSD: 3, url: "https://example.org/submit", quote: "a $3 fee" },
    pay: { kind: "cash", url: "https://example.org/submit", quote: "we pay $200" },
    response: { band: "3 to 6 months", url: "https://example.org/faq", quote: "within six months" },
    status: null,
  };
  const facts = guidelineFacts(record);
  assert.equal(facts.year, 2026);
  assert.deepEqual(facts.fee, { chargesFee: true, regularFeeCents: 300, url: "https://example.org/submit" });
  assert.deepEqual(facts.pay, { kind: "cash", url: "https://example.org/submit" });
  assert.deepEqual(facts.response, { band: "3_to_6_months", url: "https://example.org/faq" });
  assert.equal(guidelineFacts({ ...record, fee: { ...record.fee!, charges: false, amountUSD: null } }).fee?.regularFeeCents, 0);
  assert.equal(guidelineFacts({ ...record, fee: { ...record.fee!, amountUSD: null } }).fee?.regularFeeCents, null);
});

const aca = (over: Partial<AcaProgramRecord>): AcaProgramRecord => ({
  url: "https://artistcommunities.org/directory/residencies/x",
  crawledAt: "2026-10-03",
  name: "Program",
  organizationUrl: null,
  organizationName: null,
  website: null,
  locality: null,
  region: null,
  country: null,
  foundedYear: null,
  residencyFee: null,
  artistStipend: null,
  applicationFee: null,
  acceptedCount: null,
  applicantPool: null,
  meals: null,
  privateStudio: null,
  housing: null,
  wheelchair: null,
  residencyLength: null,
  disciplines: [],
  openCallUrls: [],
  ...over,
});

test("a listing matches its profile by the organisation's name", () => {
  const profiles: ResidencyProfile[] = [
    { id: "ml", name: "Mildred's Lane", kind: "residency_center", website: null, city: null, country: null },
  ];
  const program = aca({ name: "OPEN MEADOWS at MILDRED'S LANE", organizationName: "Mildred's Lane", website: "http://mildredslane.org" });
  const { matches, unmatchedListings } = matchResidencyListings(profiles, { rmar: [], acaPrograms: [program] });
  assert.equal(matches.get("ml")?.aca.length, 1);
  assert.equal(unmatchedListings.length, 0);
});

test("new residency profiles: one per program site, named for the organisation", () => {
  const listings = [
    { source: "aca" as const, record: aca({ url: "u1", name: "Archie Bray Long Term", organizationName: "Archie Bray Foundation", website: "https://archiebray.org/", locality: "Helena", country: "United States" }) },
    { source: "aca" as const, record: aca({ url: "u2", name: "Archie Bray Summer", organizationName: "Archie Bray Foundation", website: "https://www.archiebray.org/residency" }) },
    { source: "aca" as const, record: aca({ url: "u3", name: "ACA Sample Residency", organizationName: "Artist Communities Alliance SAMPLE" }) },
    { source: "rmar" as const, record: { url: "u4", name: "Mesa Refuge", website: "https://forms.gle/abc", location: "Point Reyes Station, CA, United States", crawledAt: "2026-10-03" } },
  ];
  const planned = planResidencyProfiles(listings, { nameKeys: new Set(["mesa_refuge"]), canonicalKeys: new Set() });
  assert.deepEqual(
    planned.map((p) => [p.name, p.nameKey, p.website, p.city, p.listings.length]),
    [
      ["Mesa Refuge", "mesa_refuge_point_reyes_station", null, "Point Reyes Station", 1],
      ["Archie Bray Foundation", "archie_bray_foundation", "https://archiebray.org/", "Helena", 2],
    ],
  );
});
