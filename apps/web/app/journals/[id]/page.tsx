import type { ProfileDetail } from "@missa/radar-adapters";
import { Bookmark, Clock, Sparkles, Trophy } from "lucide-react";

import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";

export const dynamic = "force-dynamic";

const UNKNOWN = "Unknown";
const PUBLIC_OPPORTUNITY_STATUSES = new Set([
  "opening-soon",
  "open",
  "closing-soon",
  "deadline-extended",
]);

function displayValue(value: string | null | undefined): string {
  return value?.trim() || UNKNOWN;
}

function displayList(values: string[]): string {
  return values.length ? values.join(", ") : UNKNOWN;
}

function profileLabel(profile: Pick<ProfileDetail, "kind">): string {
  return profile.kind === "small_press" ? "Small press" : "Literary journal";
}

function imageAlt(profile: Pick<ProfileDetail, "name" | "mediaAlt">): string {
  return profile.mediaAlt || `${profile.name} image`;
}

function mediaSrc(id: string): string {
  return `/api/journals/${encodeURIComponent(id)}/media`;
}

function emailAddress(value: string | null): string | null {
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim()
    : null;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-6 break-words text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const repository = getProfileRepository();
  if (!repository) throw new Error("The profile directory is unavailable.");
  const { id } = await params;
  const profile = await repository.getById(id);
  if (!profile) notFound();

  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const linkedOpportunityStates = new Map<
    string,
    { status: string; tracked: boolean }
  >();
  const trackedOpportunityIds = new Set<string>();
  if (profile.opportunities.length) {
    const opportunityRepository = getOpportunityRepository();
    const opportunityDetails = await Promise.all(
      profile.opportunities.map(async (opportunity) => {
        try {
          return {
            id: opportunity.id,
            detail: await opportunityRepository.getById(
              opportunity.id,
              session ? { accountId: session.account.id } : undefined,
            ),
          };
        } catch {
          return { id: opportunity.id, detail: null };
        }
      }),
    );
    for (const opportunity of opportunityDetails) {
      if (!opportunity.detail) continue;
      linkedOpportunityStates.set(opportunity.id, {
        status: opportunity.detail.status,
        tracked: Boolean(opportunity.detail.personal?.tracked),
      });
      if (opportunity.detail.personal?.tracked)
        trackedOpportunityIds.add(opportunity.id);
    }
  }

  const isSmallPress = profile.kind === "small_press";
  const bookTypes = profile.bookTypes.length
    ? profile.bookTypes
    : profile.subgenres;
  const contactEmail = emailAddress(profile.contactEmail);
  const profilePath = `/journals/${encodeURIComponent(id)}`;

  return (
    <PublicSiteShell current="Journals & presses">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-5xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        <Link
          href="/journals"
          className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          ← Journals & small presses
        </Link>

        <header className="mt-8 flex min-w-0 flex-wrap items-start gap-4 sm:gap-6">
          {profile.logoUrl || profile.mediaUrl ? (
            // Directory media is served through Missa's source-preserving media route or verified logo CDN.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logoUrl || mediaSrc(profile.id)}
              alt={imageAlt(profile)}
              decoding="async"
              className="size-20 shrink-0 rounded-xl object-cover bg-card border border-border sm:size-28"
            />
          ) : (
            <span
              role="img"
              aria-label="Image not available"
              className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-muted px-2 text-center text-xs text-muted-foreground sm:size-28"
            >
              Image not available
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
                {profileLabel(profile)}
              </p>
              {profile.intelligence?.prestigeTier ? (
                <span className="inline-flex items-center rounded-md bg-accent-tint/15 px-2 py-0.5 text-xs font-medium text-accent-deep border border-accent-tint/30">
                  {profile.intelligence.prestigeTier}
                </span>
              ) : null}
              {profile.intelligence?.foundingYear ? (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Est. {profile.intelligence.foundingYear}
                </span>
              ) : null}
              {profile.intelligence?.honors?.length ? (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  🏆 {profile.intelligence.honors[0]}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight break-words sm:text-4xl">
              {profile.name}
            </h1>
            <div className="mt-3 flex min-w-0 flex-wrap gap-x-4 gap-y-2">
              {profile.websiteUrl ? (
                <a
                  className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official website (opens in a new site){" "}
                  <span aria-hidden="true" className="ml-1">
                    ↗
                  </span>
                </a>
              ) : (
                <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">
                  Official website: {UNKNOWN}
                </span>
              )}
              {profile.sourceUrl ? (
                <a
                  className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  href={profile.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Original profile (opens in a new site){" "}
                  <span aria-hidden="true" className="ml-1">
                    ↗
                  </span>
                </a>
              ) : null}
            </div>

            {profile.socialLinks && Object.entries(profile.socialLinks).filter(([_, u]) => Boolean(u)).length > 0 ? (
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                {Object.entries(profile.socialLinks).map(([platform, url]) => {
                  if (!url) return null;
                  const label = platform.charAt(0).toUpperCase() + platform.slice(1);
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label={`${profile.name} on ${label} (opens in a new site)`}
                    >
                      <span>{label}</span>
                      <span aria-hidden="true" className="text-[10px] text-muted-foreground">↗</span>
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </header>


        <div className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:gap-10">
          <div className="min-w-0">
            {profile.intelligence ? (
              <section aria-labelledby="journal-prep-briefing" className="mb-10 rounded-2xl border border-border bg-card/70 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" aria-hidden="true" />
                  <h2 id="journal-prep-briefing" className="text-lg font-semibold tracking-tight text-foreground">
                    Creative Preparation Briefing
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Editorial demeanor and submission expectations distilled for creative alignment.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editorial Demeanor</p>
                    <p className="mt-1.5 font-semibold text-foreground">{profile.intelligence.editorialArchetype}</p>
                    {profile.intelligence.sentimentTags?.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {profile.intelligence.sentimentTags.map((tag) => (
                          <span key={tag} className="rounded-md bg-accent-tint/15 border border-accent-tint/25 px-2 py-0.5 text-xs font-medium text-accent-deep">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Response Turnaround</p>
                    <p className="mt-1.5 font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="size-4 text-primary shrink-0" aria-hidden="true" />
                      {profile.intelligence.responseLabel || profile.responseTime || "Turnaround variable"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {profile.intelligence.queryPolicy || (profile.simultaneousSubmissions ? `Simultaneous submissions: ${profile.simultaneousSubmissions}` : "Check guidelines for inquiry thresholds.")}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section aria-labelledby="journal-about-heading">
              <h2
                id="journal-about-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                About
              </h2>

              <p className="mt-3 leading-7 break-words whitespace-pre-line text-muted-foreground">
                {displayValue(profile.editorialFocus || profile.summary)}
              </p>
            </section>

            {profile.editorialTips ? (
              <section className="mt-10" aria-labelledby="journal-tips-heading">
                <h2
                  id="journal-tips-heading"
                  className="text-2xl font-semibold tracking-tight"
                >
                  Editorial tips
                </h2>
                <p className="mt-3 leading-7 break-words whitespace-pre-line text-muted-foreground">
                  {profile.editorialTips}
                </p>
              </section>
            ) : null}

            <section
              className="mt-10"
              aria-labelledby="journal-publishing-heading"
            >
              <h2
                id="journal-publishing-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                What they publish
              </h2>
              <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                <Fact label="Genres" value={displayList(profile.genres)} />
                {isSmallPress ? (
                  <Fact label="Book types" value={displayList(bookTypes)} />
                ) : null}
                <Fact label="Formats" value={displayList(profile.formats)} />
              </dl>
            </section>

            {profile.visuals && profile.visuals.filter((v) => v.assetType === "issue_cover").length > 0 ? (
              <section aria-labelledby="journal-gallery-heading" className="mt-10">
                <h2 id="journal-gallery-heading" className="text-2xl font-semibold tracking-tight">
                  Issue Archive & Covers
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recent publication covers, volumes, and visual tone spreads.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {profile.visuals
                    .filter((v) => v.assetType === "issue_cover")
                    .map((cover) => (
                      <div key={cover.id} className="group overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                        <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cover.imageUrl}
                            alt={cover.label || "Past issue cover"}
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-xs text-foreground truncate">{cover.label || "Issue Cover"}</p>
                          {cover.season || cover.issueYear ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {[cover.season, cover.issueYear].filter(Boolean).join(" ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}


            <section
              className="mt-10"
              aria-labelledby="journal-opportunities-heading"
            >
              <h2
                id="journal-opportunities-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                Open calls and related opportunities
              </h2>
              {profile.opportunities.length ? (
                <ul className="mt-4 space-y-3">
                  {profile.opportunities.map((opportunity) => (
                    <li key={opportunity.id}>
                      <article className="min-w-0 rounded-xl border border-border p-4">
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <h3 className="font-semibold break-words text-foreground">
                              {opportunity.title}
                            </h3>
                            <p className="mt-1 text-sm break-words text-muted-foreground">
                              {opportunity.deadline
                                ? `Deadline ${opportunity.deadline}`
                                : "Deadline: Unknown"}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {opportunity.status === "unknown"
                              ? "Status: Unknown"
                              : opportunity.status === "open"
                                ? "Open"
                                : "Closed"}
                          </span>
                        </div>
                        <div className="mt-3 flex min-w-0 flex-wrap gap-x-4 gap-y-2">
                          {(() => {
                            const linkedOpportunity =
                              linkedOpportunityStates.get(opportunity.id);
                            const canOpen = Boolean(
                              linkedOpportunity &&
                              (session ||
                                PUBLIC_OPPORTUNITY_STATUSES.has(
                                  linkedOpportunity.status,
                                )),
                            );
                            return canOpen ? (
                              <Link
                                href={`/opportunities/${encodeURIComponent(opportunity.id)}`}
                                className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                              >
                                {opportunity.status === "open"
                                  ? "Open opportunity on Missa"
                                  : "View opportunity on Missa"}
                              </Link>
                            ) : (
                              <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">
                                Missa detail unavailable to signed-out viewers
                              </span>
                            );
                          })()}
                          {linkedOpportunityStates.has(opportunity.id) ? (
                            session ? (
                              <SaveToTrackerButton
                                opportunityId={opportunity.id}
                                tracked={trackedOpportunityIds.has(
                                  opportunity.id,
                                )}
                              />
                            ) : (
                              <Button
                                nativeButton={false}
                                render={
                                  <Link
                                    href={`/login?next=${encodeURIComponent(profilePath)}&intent=${encodeURIComponent(`save:${opportunity.id}`)}`}
                                  />
                                }
                                variant="outline"
                                aria-label={`Sign in to save ${opportunity.title} to Tracker`}
                              >
                                <Bookmark aria-hidden="true" />
                                Sign in to save
                              </Button>
                            )
                          ) : (
                            <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">
                              Tracker save unavailable for this linked record
                            </span>
                          )}
                          {opportunity.detailUrl ? (
                            <a
                              href={opportunity.detailUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                              Open source details (opens in a new site){" "}
                              <span aria-hidden="true" className="ml-1">
                                ↗
                              </span>
                            </a>
                          ) : opportunity.officialWebsite ? (
                            <a
                              href={opportunity.officialWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              Visit organization website (opens in a new site){" "}
                              <span aria-hidden="true" className="ml-1">
                                ↗
                              </span>
                            </a>
                          ) : null}
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className="mt-3 leading-7 text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  No linked opportunities are published for this profile.
                </p>
              )}
            </section>

            {profile.prizeProvenance && profile.prizeProvenance.length > 0 ? (
              <section aria-labelledby="journal-prizes-heading" className="mt-10">
                <div className="flex items-center gap-2">
                  <Trophy className="size-6 text-primary" aria-hidden="true" />
                  <h2 id="journal-prizes-heading" className="text-2xl font-semibold tracking-tight">
                    Past Contest Winners & Winning Work
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Benchmark creative work and historical finalists to guide your manuscript preparation.
                </p>
                <div className="mt-4 space-y-3">
                  {profile.prizeProvenance.map((winner) => (
                    <div key={winner.id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                          <span className="rounded-md bg-accent-tint/15 border border-accent-tint/25 px-2 py-0.5 text-xs font-mono text-accent-deep">
                            {winner.awardYear}
                          </span>
                          <span>{winner.winnerName}</span>
                        </p>
                        {winner.judgeName ? (
                          <span className="text-xs text-muted-foreground">Selected by {winner.judgeName}</span>
                        ) : null}
                      </div>
                      {winner.winningTitle ? (
                        <p className="mt-2 text-sm text-foreground italic">“{winner.winningTitle}”</p>
                      ) : null}
                      {winner.winningWorkUrl ? (
                        <div className="mt-2.5">
                          <a
                            href={winner.winningWorkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-8 items-center text-xs font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            Read or purchase winning work (opens in a new site) ↗
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {profile.contactName ||

            profile.contactEmail ||
            profile.contactDetails ? (
              <section
                className="mt-10"
                aria-labelledby="journal-contact-heading"
              >
                <h2
                  id="journal-contact-heading"
                  className="text-2xl font-semibold tracking-tight"
                >
                  Contact
                </h2>
                <div className="mt-3 space-y-1 leading-7 text-muted-foreground">
                  {profile.contactName ? <p>{profile.contactName}</p> : null}
                  {contactEmail ? (
                    <p>
                      <a
                        className="inline-flex min-h-11 max-w-full items-center break-all underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        href={`mailto:${contactEmail}`}
                      >
                        {contactEmail}
                      </a>
                    </p>
                  ) : profile.contactEmail ? (
                    <p>Email: {UNKNOWN}</p>
                  ) : null}
                  {profile.contactDetails ? (
                    <p className="break-words whitespace-pre-line">
                      {profile.contactDetails}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <aside
            className="h-fit min-w-0 rounded-xl border border-border bg-card p-5"
            aria-labelledby="journal-details-heading"
          >
            <h2
              id="journal-details-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Submission details
            </h2>
            <dl className="mt-5 space-y-3">
              {isSmallPress ? (
                <>
                  <Fact label="Genres" value={displayList(profile.genres)} />
                  <Fact label="Book types" value={displayList(bookTypes)} />
                  <Fact label="Formats" value={displayList(profile.formats)} />
                  <Fact
                    label="Representative authors"
                    value={displayValue(profile.representativeAuthors)}
                  />
                  <Fact
                    label="Titles per year"
                    value={displayValue(profile.titlesPerYear)}
                  />
                  <Fact
                    label="Publishes through contests only"
                    value={displayValue(profile.publishesThroughContestsOnly)}
                  />
                  <Fact
                    label="Reading period"
                    value={displayValue(profile.readingPeriod)}
                  />
                  <Fact
                    label="Response time"
                    value={displayValue(profile.responseTime)}
                  />
                </>
              ) : (
                <>
                  <Fact label="Genres" value={displayList(profile.genres)} />
                  <Fact label="Formats" value={displayList(profile.formats)} />
                  <Fact
                    label="Reading period"
                    value={displayValue(profile.readingPeriod)}
                  />
                  <Fact
                    label="Response time"
                    value={displayValue(profile.responseTime)}
                  />
                  <Fact
                    label="Reading fee"
                    value={displayValue(profile.readingFee)}
                  />
                  <Fact
                    label="Unsolicited submissions"
                    value={displayValue(profile.unsolicitedSubmissions)}
                  />
                  <Fact
                    label="Simultaneous submissions"
                    value={displayValue(profile.simultaneousSubmissions)}
                  />
                  <Fact label="Payment" value={displayValue(profile.payment)} />
                  <Fact
                    label="Issues per year"
                    value={displayValue(profile.issuesPerYear)}
                  />
                  <Fact
                    label="Issue price"
                    value={displayValue(profile.issuePrice)}
                  />
                  <Fact
                    label="Subscription price"
                    value={displayValue(profile.subscriptionPrice)}
                  />
                  <Fact
                    label="Circulation"
                    value={displayValue(profile.circulation)}
                  />
                </>
              )}
            </dl>
            {profile.submissionGuidelinesUrl ? (
              <a
                className="mt-6 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                href={profile.submissionGuidelinesUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Submission guidelines (opens in a new site){" "}
                <span aria-hidden="true" className="ml-1">
                  ↗
                </span>
              </a>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                Submission guidelines: {UNKNOWN}
              </p>
            )}
          </aside>
        </div>
      </main>
    </PublicSiteShell>
  );
}
