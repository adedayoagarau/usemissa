import type { ProfileDetail } from "@missa/radar-adapters";
import { Bookmark } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { getProfileRepository } from "@/lib/profileRepository";
import {
  monogramFor,
  submissionWindowStatus,
  type SubmissionWindowStatus,
} from "@/lib/journalPresentation";
import { PublicSiteShell } from "@/components/public-site-shell";

export const dynamic = "force-dynamic";

const UNKNOWN = "Unknown";
const PUBLIC_OPPORTUNITY_STATUSES = new Set([
  "opening-soon",
  "open",
  "closing-soon",
  "deadline-extended",
]);

type ChipTone = "positive" | "accent" | "neutral";

function displayValue(value: string | null | undefined): string {
  return value?.trim() || UNKNOWN;
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

function compactFactText(label: string, value: string): string {
  const normalized = value.trim().toLowerCase();
  if (
    label === "Reading fee" &&
    /^(no|none|free|0(?:\.0+)?)$/.test(normalized)
  ) {
    return "No reading fee";
  }
  if (label === "Payment" && /cash/.test(normalized)) {
    return "Pays cash";
  }
  if (
    label === "Simultaneous submissions" &&
    /^(yes|allowed|accepted|okay|ok)/.test(normalized)
  ) {
    return "Simultaneous submissions OK";
  }
  if (
    label === "Unsolicited submissions" &&
    /^(yes|allowed|accepted|okay|ok)/.test(normalized)
  ) {
    return "Unsolicited submissions accepted";
  }
  if (label === "Issues per year") return `${value} issues/year`;
  return `${label}: ${value}`;
}

function compactFactTone(label: string, value: string): ChipTone {
  const normalized = value.trim().toLowerCase();
  if (
    (label === "Reading fee" &&
      /^(no|none|free|0(?:\.0+)?)$/.test(normalized)) ||
    (label === "Payment" && /cash|paid|yes/.test(normalized)) ||
    ((label === "Simultaneous submissions" ||
      label === "Unsolicited submissions") &&
      /^(yes|allowed|accepted|okay|ok)/.test(normalized))
  ) {
    return "positive";
  }
  return "accent";
}

function FactChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  const toneClasses = {
    positive: "border-green/20 bg-lichen-tint text-green",
    accent: "border-primary/20 bg-accent-tint text-accent-deep",
    neutral: "border-border bg-muted text-foreground",
  } satisfies Record<ChipTone, string>;

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs leading-5 font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function TagGroup({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <FactChip key={`${label}:${value}`} tone="accent">
            {value}
          </FactChip>
        ))}
      </div>
    </div>
  );
}

function SubmissionStatus({ status }: { status: SubmissionWindowStatus }) {
  const toneClasses = {
    open: "border-green/20 bg-lichen-tint text-green",
    closed: "border-border bg-muted text-foreground",
    unknown: "border-mineral-blue/20 bg-mineral-blue-tint text-mineral-blue",
  } satisfies Record<SubmissionWindowStatus["kind"], string>;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" role="status">
      <span
        className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${toneClasses[status.kind]}`}
      >
        <span aria-hidden="true" className="text-[0.7rem]">
          ●
        </span>
        {status.label}
      </span>
      {status.detail ? (
        <span className="text-sm text-muted-foreground">{status.detail}</span>
      ) : null}
    </div>
  );
}

function emailAddress(value: string | null): string | null {
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim()
    : null;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
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
  if (profile.id !== id) {
    permanentRedirect(`/journals/${encodeURIComponent(profile.id)}`);
  }

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
  const monogram = monogramFor(profile.name);
  const submissionStatus = submissionWindowStatus(profile.readingPeriod);
  const keySubmissionFields: Array<readonly [string, string | null]> =
    isSmallPress
      ? [
          ["Titles per year", profile.titlesPerYear],
          [
            "Publishes through contests only",
            profile.publishesThroughContestsOnly,
          ],
        ]
      : [
          ["Reading fee", profile.readingFee],
          ["Unsolicited submissions", profile.unsolicitedSubmissions],
          ["Simultaneous submissions", profile.simultaneousSubmissions],
          ["Payment", profile.payment],
          ["Issues per year", profile.issuesPerYear],
        ];
  const keySubmissionFacts = keySubmissionFields.flatMap(([label, value]) => {
    const trimmedValue = typeof value === "string" ? value.trim() : "";
    if (!trimmedValue) return [];
    return [
      {
        label,
        text: compactFactText(label, trimmedValue),
        tone: compactFactTone(label, trimmedValue),
      },
    ];
  });

  return (
    <PublicSiteShell current="Journals & presses">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-5xl min-w-0 bg-background px-4 py-12 sm:px-6 sm:py-16"
      >
        <Link
          href="/journals"
          className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary underline decoration-accent-tint underline-offset-4 hover:text-accent-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          ← Journals & small presses
        </Link>

        <header className="mt-8 flex min-w-0 flex-wrap items-start gap-4 border-b border-border pb-8 sm:gap-6">
          {profile.mediaUrl ? (
            <img
              src={mediaSrc(profile.id)}
              alt={imageAlt(profile)}
              decoding="async"
              className="size-20 shrink-0 rounded-xl object-cover sm:size-28"
            />
          ) : (
            <span
              role="img"
              aria-label={`${profile.name} monogram`}
              className={`flex size-20 shrink-0 items-center justify-center rounded-xl border px-2 text-center font-heading text-2xl font-semibold tracking-tight sm:size-28 sm:text-4xl ${monogram.tone}`}
            >
              {monogram.letters}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
              {profileLabel(profile)}
            </p>
            <h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight break-words sm:text-5xl">
              {profile.name}
            </h1>
            <div className="mt-4">
              <SubmissionStatus status={submissionStatus} />
            </div>
            {profile.genres.length ? (
              <div className="mt-4">
                <TagGroup label="Genres" values={profile.genres} />
              </div>
            ) : null}
            <div className="mt-5 flex min-w-0 flex-wrap items-center gap-3">
              {profile.websiteUrl ? (
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  variant="outline"
                >
                  Official website
                  <span aria-hidden="true" className="ml-1">
                    ↗
                  </span>
                </Button>
              ) : (
                <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">
                  Official website: {UNKNOWN}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:gap-10">
          <div className="min-w-0">
            <section aria-labelledby="journal-about-heading">
              <h2
                id="journal-about-heading"
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                About
              </h2>
              <p className="mt-3 leading-7 break-words whitespace-pre-line text-foreground/80">
                {displayValue(profile.editorialFocus || profile.summary)}
              </p>
            </section>

            {profile.editorialTips ? (
              <section className="mt-10" aria-labelledby="journal-tips-heading">
                <h2
                  id="journal-tips-heading"
                  className="font-heading text-2xl font-semibold tracking-tight"
                >
                  Editorial tips
                </h2>
                <p className="mt-3 leading-7 break-words whitespace-pre-line text-foreground/80">
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
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                What they publish
              </h2>
              <div className="mt-5 space-y-5">
                {isSmallPress ? (
                  <TagGroup label="Book types" values={bookTypes} />
                ) : null}
                <TagGroup label="Formats" values={profile.formats} />
                {!profile.formats.length &&
                (!isSmallPress || !bookTypes.length) ? (
                  <p className="text-sm text-muted-foreground">
                    Formats: {UNKNOWN}
                  </p>
                ) : null}
              </div>
            </section>

            <section
              className="mt-10"
              aria-labelledby="journal-opportunities-heading"
            >
              <h2
                id="journal-opportunities-heading"
                className="font-heading text-2xl font-semibold tracking-tight"
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
                            <p className="mt-1 text-sm break-words text-foreground/70">
                              {opportunity.deadline
                                ? `Deadline ${opportunity.deadline}`
                                : "Deadline: Unknown"}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-medium text-muted-foreground">
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
                          {opportunity.officialWebsite ? (
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
                  className="font-heading text-2xl font-semibold tracking-tight"
                >
                  Contact
                </h2>
                <div className="mt-3 space-y-1 leading-7 text-foreground/80">
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
            className="h-fit min-w-0 rounded-xl border border-primary/15 bg-card p-5"
            aria-labelledby="journal-details-heading"
          >
            <h2
              id="journal-details-heading"
              className="font-heading text-xl font-semibold tracking-tight"
            >
              Submission details
            </h2>
            <div
              className="mt-5 flex min-w-0 flex-wrap gap-2"
              aria-label="Key submission facts"
            >
              {keySubmissionFacts.length ? (
                keySubmissionFacts.map((fact) => (
                  <FactChip key={fact.label} tone={fact.tone}>
                    {fact.text}
                  </FactChip>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Submission details: {UNKNOWN}
                </p>
              )}
            </div>
            <dl className="mt-5 space-y-3">
              {isSmallPress ? (
                <>
                  <Fact
                    label="Representative authors"
                    value={displayValue(profile.representativeAuthors)}
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
                  <Fact
                    label="Reading period"
                    value={displayValue(profile.readingPeriod)}
                  />
                  <Fact
                    label="Response time"
                    value={displayValue(profile.responseTime)}
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
