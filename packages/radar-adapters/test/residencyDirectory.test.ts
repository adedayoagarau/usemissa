import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  mealsFrom,
  parseAcaOpenCall,
  parseAcaProgram,
  privateStudioFrom,
} from "../src/ranking/residency/acaDirectory.js";
import {
  matchResidencyListings,
  residencyFacts,
  siteKey,
  type ResidencyProfile,
} from "../src/ranking/residency/recompute.js";

const fixture = (name: string) =>
  readFileSync(new URL(`../../test/fixtures/residency/${name}`, import.meta.url), "utf8");
const PROGRAM = "https://artistcommunities.org/directory/residencies/";

test("reads a program page's recorded fees, stipend, meals, studio and selection", () => {
  const program = parseAcaProgram(fixture("aca-program-interlude.html"), `${PROGRAM}interlude`, "2026-10-03");
  assert.equal(program.name, "Interlude Artist Residency");
  assert.equal(program.website, "https://interluderesidency.com/");
  assert.deepEqual([program.locality, program.region, program.country], ["Hudson", "NY", "United States"]);
  assert.equal(program.foundedYear, 2019);
  assert.deepEqual(program.residencyFee, { amount: 0, currency: "US Dollar (USD)" });
  assert.deepEqual(program.artistStipend, { amount: 600, currency: "US Dollar (USD)" });
  assert.deepEqual(program.applicationFee, { amount: 10, currency: "US Dollar (USD)" });
  assert.equal(program.acceptedCount, 17);
  assert.equal(program.applicantPool, 450);
  assert.equal(program.meals, "some");
  assert.equal(program.privateStudio, true);
  assert.equal(program.residencyLength, "3 weeks - 4 weeks");
  assert.deepEqual(program.openCallUrls, [
    "https://artistcommunities.org/directory/open-calls/interludes-2026-open-call",
  ]);
});

test("records a charged fee, no meals and shared studios as recorded absences", () => {
  const paid = parseAcaProgram(fixture("aca-program-paid.html"), `${PROGRAM}truro`, "2026-10-03");
  assert.equal(paid.residencyFee?.amount, 1500);
  assert.equal(paid.artistStipend?.amount, 0);
  assert.equal(paid.meals, "none");
  assert.equal(paid.privateStudio, false);
  const omi = parseAcaProgram(fixture("aca-program-allmeals.html"), `${PROGRAM}art-omi`, "2026-10-03");
  assert.equal(omi.meals, "all");
  assert.equal(omi.acceptedCount, null);
});

test("meal and studio wording maps to the scored values", () => {
  assert.equal(mealsFrom(["Residents have access to shared kitchen"]), null);
  assert.equal(mealsFrom(["Groceries provided for residents to prepare their own meals"]), "some");
  assert.equal(mealsFrom(["No meals are provided", "Residents have access to private kitchen"]), "none");
  assert.equal(privateStudioFrom(["Shared Studios", "Private Studios"]), true);
  assert.equal(privateStudioFrom(["Easels"]), null);
});

test("reads an open call's deadline", () => {
  const call = parseAcaOpenCall(
    fixture("aca-open-call.html"),
    "https://artistcommunities.org/directory/open-calls/interludes-2026-open-call",
  );
  assert.equal(call.title, "Interlude's 2026 Open Call!");
  assert.equal(call.deadline, "2026-03-07");
  assert.equal(call.rolling, false);
});

test("site keys ignore scheme and www, and keep the page on shared hosts", () => {
  assert.equal(siteKey("https://www.macdowell.org/apply"), "macdowell.org");
  assert.equal(siteKey("macdowell.org"), "macdowell.org");
  assert.equal(siteKey("https://www.instagram.com/someresidency/"), "instagram.com/someresidency");
  assert.equal(siteKey("https://www.instagram.com/"), null);
  assert.equal(siteKey(""), null);
});

const profiles: ResidencyProfile[] = [
  { id: "org_resartis_omi", name: "Art Omi", kind: "residency_center", website: "https://artomi.org", city: null, country: null },
  { id: "org_trans_omi", name: "Art Omi Residencies", kind: "visual_arts_organization", website: "artomi.org", city: null, country: null },
  { id: "mag", name: "Interlude", kind: "literary_magazine", website: "https://interluderesidency.com", city: null, country: null },
];

test("listings match profiles by website and prefer the residency profile", () => {
  const omi = parseAcaProgram(fixture("aca-program-allmeals.html"), `${PROGRAM}art-omi`, "2026-10-03");
  const interlude = parseAcaProgram(fixture("aca-program-interlude.html"), `${PROGRAM}interlude`, "2026-10-03");
  // Magazines are not residency profiles, so Interlude finds no profile here.
  const { matches, unmatched } = matchResidencyListings(
    profiles.filter((p) => p.kind !== "literary_magazine"),
    { acaPrograms: [omi, interlude], rmar: [] },
  );
  assert.deepEqual([...matches.keys()], ["org_resartis_omi"]);
  assert.equal(matches.get("org_resartis_omi")?.siblings.length, 2);
  assert.equal(unmatched.length, 1);
});

test("facts combine programs and cite the page that records each", () => {
  const omi = parseAcaProgram(fixture("aca-program-allmeals.html"), `${PROGRAM}art-omi`, "2026-10-03");
  const paid = { ...parseAcaProgram(fixture("aca-program-paid.html"), `${PROGRAM}truro`, "2026-10-03"), website: omi.website };
  const facts = residencyFacts(
    {
      profile: profiles[0],
      siblings: profiles.slice(0, 2),
      aca: [paid, omi],
      rmar: [
        {
          url: "https://ratemyartistresidency.com/residency/art-omi",
          name: "Art Omi",
          ratingValue: 4.5,
          ratingCount: 9,
          callInfo: { name: "Expired call", deadline: "2026-01-01", applicationUrl: null },
          crawledAt: "2026-09-11T14:28:15.045Z",
        },
      ],
    },
    { today: "2026-10-03", acaCalls: new Map(), missaCalls: [], missaRatings: [5] },
  );
  assert.equal(facts.freeToAttend, true, "a free program counts as a free route");
  assert.equal(facts.sources.fee?.url, `${PROGRAM}art-omi`);
  assert.equal(facts.hasStipend, true);
  assert.equal(facts.meals, "all");
  assert.equal(facts.privateStudio, true);
  assert.equal(facts.acceptedCount, null, "an applicant pool of 0 is not a selection fact");
  assert.equal(facts.foundedYear, 1992);
  assert.deepEqual(facts.rating, { value: 4.55, count: 10 });
  assert.equal(facts.openCall, null, "expired calls are not current");
  assert.deepEqual(facts.directories, ["Artist Communities Alliance", "RateMyArtistResidency", "Res Artis", "TransArtists"]);
  assert.equal(facts.sources.rating?.recordedOn, "2026-09-11");
});
