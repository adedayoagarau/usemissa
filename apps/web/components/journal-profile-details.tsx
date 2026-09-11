import Link from "next/link";
import type { ProfileDetail, MagazineRankingRow, MagazineTelemetrySummary, EditorialIntelligenceFullProfile } from "@missa/radar-adapters";
import { Award, Clock, Trophy } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { ReportResponseDialog } from "@/components/rankings/report-response-dialog";
import { JournalTelemetryPanel } from "@/components/rankings/journal-telemetry-panel";
import { ContentIssueReportDialog } from "@/components/content-issue-report-dialog";
import { EditorialIntelligenceSection } from "@/components/opportunities/editorial-intelligence-section";

export function JournalProfileDetails({
  profile,
  rankings,
  telemetrySummary,
  editorialIntelligence,
  signedIn,
}: {
  profile: ProfileDetail;
  rankings: MagazineRankingRow[];
  telemetrySummary: MagazineTelemetrySummary;
  editorialIntelligence?: EditorialIntelligenceFullProfile | null;
  signedIn: boolean;
}) {
const primaryRank = rankings.find(r => r.genre === "overall") ?? rankings[0];
return <section id="profile-rankings" aria-label="Magazine rankings and response reports">
            {editorialIntelligence && (
              <div className="mt-6 mb-8">
                <EditorialIntelligenceSection intelligence={editorialIntelligence} />
              </div>
            )}
            {profile.intelligence || rankings.length > 0 ? (
              <Accordion className="mt-8"><AccordionItem value="editorial-details"><AccordionTrigger>Editorial details and rankings</AccordionTrigger><AccordionContent>
                {profile.intelligence?.prestigeTier && <p>{profile.intelligence?.prestigeTier}</p>}
                {(profile.intelligence?.honors.length ?? 0) > 0 && <p>{profile.intelligence?.honors.join(" · ")}</p>}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editorial approach</p>
                    <p className="mt-1.5 font-semibold text-foreground">{profile.intelligence?.editorialArchetype}</p>
                    {profile.intelligence?.sentimentTags?.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {profile.intelligence?.sentimentTags.map((tag) => (
                          <span key={tag} className="rounded-md bg-accent-tint/15 border border-accent-tint/25 px-2 py-0.5 text-xs font-medium text-accent-deep">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Response time</p>
                      <ReportResponseDialog
                        profileId={profile.id}
                        magazineName={profile.name}
                      />
                    </div>
                    <p className="mt-1.5 font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="size-4 text-primary shrink-0" aria-hidden="true" />
                      {profile.intelligence?.responseLabel || profile.responseTime || "Turnaround variable"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {profile.intelligence?.queryPolicy || (profile.simultaneousSubmissions ? `Simultaneous submissions: ${profile.simultaneousSubmissions}` : "Check guidelines for inquiry thresholds.")}
                    </p>
                  </div>
                </div>

                {rankings.length > 0 ? (
                  <div className="mt-4 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Missa rankings
                      </p>
                      <Link
                        href="/rankings/magazines"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View rankings →
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rankings.map((r) => (
                        <div
                          key={r.genre}
                          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
                        >
                          <Award className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                          <span className="font-semibold text-foreground">
                            #{r.rankPosition} {r.genre === "overall" ? "Overall" : r.genre.charAt(0).toUpperCase() + r.genre.slice(1)}
                          </span>
                          <span className="font-mono text-muted-foreground">({r.totalScore} pts)</span>
                          <RankingTierBadge tier={r.prestigeTier} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </AccordionContent></AccordionItem></Accordion>
            ) : null}

            <Accordion><AccordionItem value="response-reports"><AccordionTrigger>Response reports</AccordionTrigger><AccordionContent>
            <JournalTelemetryPanel
              profileId={profile.id}
              magazineName={profile.name}
              telemetry={telemetrySummary}
              ranking={primaryRank}
            />
            </AccordionContent></AccordionItem></Accordion>


            {profile.prizeProvenance && profile.prizeProvenance.length > 0 ? (
              <section aria-labelledby="journal-prizes-heading" className="mt-10">
                <div className="flex items-center gap-2">
                  <Trophy className="size-6 text-primary" aria-hidden="true" />
                  <h2 id="journal-prizes-heading" className="text-2xl font-semibold tracking-tight">
                    Prize history
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Past winners and selected work.
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
                      {winner.winningWorkUrl && profile.websiteUrl && (() => { try { return new URL(winner.winningWorkUrl).hostname.replace(/^www\./, "") === new URL(profile.websiteUrl).hostname.replace(/^www\./, ""); } catch { return false; } })() ? (
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

            <div className="mt-10 border-t border-border pt-5">
              <ContentIssueReportDialog
                subjectType="journal"
                subjectId={profile.id}
                subjectName={profile.name}
                subjectPath={`/journal/${encodeURIComponent(profile.slug)}`}
                signedIn={signedIn}
              />
            </div>

</section>;
}
