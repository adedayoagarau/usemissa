import type { ProfileDetail } from "@missa/radar-adapters";
import { Bookmark } from "lucide-react";
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
          {profile.mediaUrl ? (
            // Directory media is served through Missa's source-preserving media route.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(profile.id)}
              alt={imageAlt(profile)}
              decoding="async"
              className="size-20 shrink-0 rounded-xl object-cover sm:size-28"
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
            <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
              {profileLabel(profile)}
            </p>
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
          </div>
        </header>

        <div className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:gap-10">
          <div className="min-w-0">
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
