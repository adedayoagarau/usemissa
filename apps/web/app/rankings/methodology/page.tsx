import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, DollarSign, Clock, CheckCircle2, ShieldCheck, Sparkles, Scale, HeartHandshake } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Ranking Methodology · Missa Literary Magazine Index",
  description:
    "How the Missa Literary Magazine Index evaluates publication prestige, writer compensation, turnaround dignity, and submission ethics.",
};

export default function RankingsMethodologyPage() {
  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-4xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        {/* Navigation Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/rankings/magazines"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Magazine Rankings
          </Link>
        </div>

        {/* Header */}
        <header className="mb-12">
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Editorial Framework · 2026 Edition
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            How We Rank Literary Magazines
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            A guide to the Missa Literary Magazine Index (MLMI): why we built a multi-dimensional benchmark, how our 100-point composite score works, and how writers can use these numbers to shape their submission journeys.
          </p>
        </header>

        {/* Section 1: The Philosophy */}
        <section className="space-y-8 text-base leading-7 text-foreground/90">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Why an Expanded Literary Index?
            </h2>
            <p className="mt-3 text-muted-foreground">
              For years, writers seeking an honest sense of the literary landscape have turned to dedicated labor: Clifford Garstang’s meticulous decade-long Pushcart Prize tallies, Erika Krouse’s generous and beloved fiction tiers, and community logs kept on notebooks and spreadsheets across the country. These resources laid essential ground for our community.
            </p>
            <p className="mt-3 text-muted-foreground">
              Yet every writer knows that a journal’s true standing in your creative life isn’t defined by prize volume alone. A magazine that wins national honors but charges $5 per submission, takes eleven months to respond, and offers zero contributor payment creates a fundamentally different publishing relationship than a journal that pays competitive honoraria, respects your time with a prompt turnaround, and offers fee-free reading windows.
            </p>
            <p className="mt-3 text-muted-foreground">
              The Missa Literary Magazine Index was built to hold both truths together: celebrating literary excellence while honoring writer dignity and access.
            </p>
          </div>

          {/* Section 2: The Four Distinct Indexes */}
          <div className="pt-4">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Four Tailored Indexes
            </h2>
            <p className="mt-2 text-muted-foreground">
              Because literary magazines rarely treat all genres identically, Missa calculates four separate standings:
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  Overall Composite Index
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Evaluates 698 publications holistically across their entire publishing imprint, balancing prose and verse honors with operational ethics.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Award className="size-4 text-primary" />
                  Poetry Index
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Evaluates 427 journals based specifically on <em>Best American Poetry</em>, Pushcart poetry selections, and poetry-specific contributor rates.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Scale className="size-4 text-primary" />
                  Fiction Index
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Evaluates 293 fiction venues using <em>Best American Short Stories</em>, the O. Henry Prize, Pushcart fiction honors, and short story pay.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <HeartHandshake className="size-4 text-primary" />
                  Nonfiction Index
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Evaluates 250 creative nonfiction and essay venues using <em>Best American Essays</em>, Pushcart nonfiction, and essayist honoraria.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: The 100-Point Scoring Architecture */}
          <div className="pt-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              The 100-Point Scoring Architecture
            </h2>
            <p className="mt-2 text-muted-foreground">
              Every magazine receives an objective, transparent score out of 100 points, calculated across six pillars:
            </p>

            <div className="mt-6 space-y-4">
              {/* Pillar 1 */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Award className="size-5 text-primary" />
                    Pillar 1: Accolades & Curatorial Recognition
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    40 Points Maximum
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Measures presence across major anthologies over a 10-year rolling window: the <strong>Pushcart Prize</strong>, the <strong>Best American series</strong> (Short Stories, Essays, Poetry), the <strong>O. Henry Prize</strong>, <strong>Best of the Net</strong>, <strong>Best Small Fictions</strong>, and <strong>Best Microfiction</strong>. To reward journals actively championing great work today, awards within the last 5 years carry full weight (1.0x), while citations between 6 and 10 years carry a gentle recency decay (0.5x).
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <DollarSign className="size-5 text-primary" />
                    Pillar 2: Contributor Compensation
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    15 Points Maximum
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Writers deserve tangible support for their labor. <strong>Pro payment</strong> (≥$50/poem, ≥$100/piece, or ≥5¢/word) earns the full 15 points. <strong>Semi-pro payment</strong> ($25–$49/poem or $40–$99/piece) earns 10 points. <strong>Token honoraria</strong> ($10–$24) earn 5 points, contributor copies earn 2 points, and completely unpaid publication receives 0 points.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Clock className="size-5 text-primary" />
                    Pillar 3: Turnaround Speed & Reliability
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    15 Points Maximum
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Time spent waiting in silence is emotional and career friction. Journals responding within <strong>30 days</strong> receive 15 points; within <strong>60 days</strong> receive 12 points; within <strong>120 days</strong> receive 8 points; scaling down to 0 points for journals exceeding 365 days. Turnaround medians are dynamically refreshed in PostgreSQL as writers report real response dates.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CheckCircle2 className="size-5 text-primary" />
                    Pillar 4: Submission Fees & Financial Accessibility
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    15 Points Maximum
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Reading fees create steep financial barriers for emerging and working-class writers. <strong>100% Free regular submissions</strong> receive 15 points. Journals that provide verified fee waivers or free submission periods receive 11 points. Modest platform pass-through costs (≤$3.50) receive 7 points, while steep reading fees (&gt;$5) for general submissions receive 0 points.
                </p>
              </div>

              {/* Pillar 5 */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <ShieldCheck className="size-5 text-primary" />
                    Pillar 5: Editorial Respect & Author Flexibility
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    10 Points Maximum
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Writers shouldn't be locked into single-journal exclusive holds for months at a time. Journals that welcome <strong>simultaneous submissions</strong> receive 6 points (conditional policies earn 3 points). Transparent status query horizons (encouraging inquiries within 180 days) earn up to 4 additional points.
                </p>
              </div>

              {/* Pillar 6 */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Sparkles className="size-5 text-primary" />
                    Pillar 6: Format Longevity & Publishing Ethics
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    5 Points Maximum
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Measures the permanence and care given to accepted work: verified digital archives and print libraries (2 points), blind reading practices that reduce unconscious bias (1.5 points), and intentional space reserved for debut and emerging voices (1.5 points).
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Prestige Tiers */}
          <div className="pt-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Understanding the Prestige Tiers
            </h2>
            <p className="mt-2 text-muted-foreground">
              Based on the 100-point composite score, publications are grouped into four clear tiers:
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-4 rounded-xl border border-border bg-card/40 p-4">
                <span className="inline-flex shrink-0 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  Tier 1 · Score 75+
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Flagship Luminary</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The highest echelon of literary visibility and respect. These publications consistently publish prizewinning work, offer fair pay, and maintain reputable editorial practices.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-border bg-card/40 p-4">
                <span className="inline-flex shrink-0 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                  Tier 2 · Score 60–74
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">High Distinction</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Prestigious, career-building journals with regular anthology presence, solid writer stewardship, and strong institutional or independent backing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-border bg-card/40 p-4">
                <span className="inline-flex shrink-0 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Tier 3 · Score 45–59
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Distinguished Contemporary</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dynamic, competitive magazines with dedicated readerships. Many of the most daring, debut-friendly, and formally inventive pieces in contemporary literature emerge from Tier 3 journals.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-border bg-card/40 p-4">
                <span className="inline-flex shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  Tier 4 · Score &lt; 45
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Emerging & Community</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vital community literary spaces, early-stage publications, and grassroots presses that give writers their first publication credits and foster vital artistic circles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: How Writers Can Use This */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 mt-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              How to Use the Index in Your Writing Life
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Rankings should serve your craft, not intimidate it. We encourage writers to build a balanced portfolio strategy for each manuscript:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <strong>Send to a spread of tiers:</strong> Combine a couple of Tier 1 "reach" journals with Tier 2 targets and Tier 3 venues whose editorial voices you personally admire.
              </li>
              <li>
                <strong>Batch simultaneous submissions:</strong> Filter for journals that permit simultaneous submissions and respond in under 60 days to avoid having your work locked up for seasons.
              </li>
              <li>
                <strong>Protect your budget:</strong> Use the "$0 Fee" toggle to ensure you are never priced out of submitting your work.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/rankings/magazines"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-deep"
              >
                Explore the Rankings Index <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/rankings/compare"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Compare Journals Side-by-Side
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
}
