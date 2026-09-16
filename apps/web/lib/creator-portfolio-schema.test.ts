import assert from "node:assert/strict";
import test from "node:test";
import {
  coercePortfolioTheme,
  portfolioSchema,
  PORTFOLIO_THEMES,
} from "./creator-portfolio-schema";

test("portfolio theme defaults to sage and keeps the public palette", () => {
  assert.deepEqual([...PORTFOLIO_THEMES], ["sage", "paper", "mineral", "night"]);
  assert.equal(portfolioSchema.parse({}).theme, "sage");
});

test("coerces legacy and unknown theme values to the canonical default", () => {
  assert.equal(coercePortfolioTheme("white"), "sage");
  assert.equal(coercePortfolioTheme("sage"), "sage");
  assert.equal(coercePortfolioTheme("night"), "night");
  assert.equal(coercePortfolioTheme(undefined), "sage");
  assert.equal(coercePortfolioTheme(null), "sage");
  assert.equal(coercePortfolioTheme(42), "sage");
});

test("schema rejects the removed white theme so the upgrade path must coerce it", () => {
  const result = portfolioSchema.safeParse({ theme: "white" });
  assert.equal(result.success, false);
});
