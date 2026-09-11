import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ManuscriptMatchEngine } from "../src/ranking/manuscriptMatchEngine.js";

describe("ManuscriptMatchEngine", () => {
  it("computes matches and groups into tiers without pool", async () => {
    const engine = new ManuscriptMatchEngine(null);
    const result = await engine.matchManuscript({
      genre: "fiction",
      wordCount: 3200,
      aestheticTags: ["fabulist", "dark", "lyric"],
      compAuthors: ["Carmen Maria Machado"],
      isDebutAuthor: true,
      allowSimultaneous: true,
    });

    assert.ok(result.totalAnalyzed > 0);
    assert.ok(result.dreamReach.length > 0 || result.debutChampions.length > 0);

    const splitLip = result.debutChampions.find((c) => c.slug === "split-lip-magazine") ??
      result.simultaneousPackets.find((c) => c.slug === "split-lip-magazine");

    assert.ok(splitLip, "Split Lip should be matched for fabulist Machado comps");
    assert.ok(splitLip.matchScore >= 80, "Match score should reflect strong alignment");
    assert.strictEqual(splitLip.aesthetic.isDebutChampion, true);
  });
});
