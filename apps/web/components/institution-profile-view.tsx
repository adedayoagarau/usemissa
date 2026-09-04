import type { ProfileDetail } from "@missa/radar-adapters";
import { KIND_METADATA } from "./institution-directory-view";
import Link from "next/link";
import { Globe, ArrowLeft, ArrowUpRight, Calendar, Sparkles, Building2, CheckCircle2, MapPin } from "lucide-react";
import { cleanCrawledNarrative, cleanTitleOrLabel } from "@/lib/textUtils";

function safeHostname(url?: string | null): string {
  if (!url) return "Official website";
  try {
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    return new URL(formatted).hostname.replace(/^www\./, "");
  } catch {
    return "Official website";
  }
}

function safeHref(url?: string | null): string {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
}

interface InstitutionProfileViewProps {
  profile: ProfileDetail;
}

export function InstitutionProfileView({ profile }: InstitutionProfileViewProps) {
  const meta = KIND_METADATA[profile.kind] || KIND_METADATA.all;
  const Icon = meta.icon;
  const logoUrl = profile.logoUrl;
  const bannerUrl = profile.bannerUrl;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Back link */}
      <nav aria-label="Breadcrumb">
        <Link
          href={meta.path}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to {meta.plural}
        </Link>
      </nav>

      {bannerUrl ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt={profile.bannerAlt || `${profile.name} editorial image`}
            className="aspect-[21/9] w-full object-cover"
          />
        </div>
      ) : null}

      {/* Hero Header */}
      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-8">
        <div className="flex items-start gap-4 sm:gap-5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${profile.name} logo`}
              className="size-20 sm:size-24 shrink-0 rounded-2xl border border-border/80 object-contain bg-background p-2 shadow-xs"
            />
          ) : (
            <div className="flex size-20 sm:size-24 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/40 text-muted-foreground">
              <Icon className="size-8 opacity-70" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-medium text-primary">
                {meta.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                Verified Radar Profile
              </span>
            </div>

            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl break-words">
              {profile.name}
            </h1>

            {profile.websiteUrl ? (
              <a
                href={safeHref(profile.websiteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                <Globe className="size-3.5" aria-hidden="true" />
                {safeHostname(profile.websiteUrl)}
                <ArrowUpRight className="size-3 opacity-60" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>

        {profile.websiteUrl ? (
          <a
            href={safeHref(profile.websiteUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
          >
            Visit Official Website
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </header>

      {/* Main Content Layout */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Primary Content (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Biography / Curatorial Focus */}
          {profile.summary || profile.editorialFocus ? (
            <section aria-labelledby="about-heading" className="space-y-3">
              <h2 id="about-heading" className="font-heading text-lg font-semibold text-foreground">
                About {cleanTitleOrLabel(profile.name)}
              </h2>
              <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {cleanCrawledNarrative(profile.summary || profile.editorialFocus)}
              </div>
            </section>
          ) : null}

          {/* Active Published Opportunities */}
          <section aria-labelledby="opportunities-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="opportunities-heading" className="font-heading text-lg font-semibold text-foreground">
                Opportunities & Open Calls
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {profile.opportunities.length} {profile.opportunities.length === 1 ? "call" : "calls"}
              </span>
            </div>

            {profile.opportunities.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {profile.opportunities.map((opp) => (
                  <div key={opp.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-medium ${opp.status === "open" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          ● {opp.status === "open" ? "Active Call" : "Closed / Upcoming"}
                        </span>
                        {opp.deadline ? (
                          <span className="text-muted-foreground">
                            · Deadline: {String(opp.deadline)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">· Rolling admissions</span>
                        )}
                      </div>
                      <h3 className="mt-1 font-heading text-base font-semibold text-foreground break-words">
                        {opp.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/opportunities/${opp.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        View Details
                      </Link>
                      {opp.officialWebsite ? (
                        <a
                          href={opp.officialWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                          Apply <ArrowUpRight className="size-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No active open calls currently listed for this cycle. Check back soon or visit their official website.
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Metadata (1 col) */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Institutional Facts
            </h3>

            <dl className="divide-y divide-border text-xs space-y-3">
              <div className="pt-2 flex justify-between">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium text-foreground">{meta.label}</dd>
              </div>

              {profile.intelligence?.foundingYear ? (
                <div className="pt-3 flex justify-between">
                  <dt className="text-muted-foreground">Founded</dt>
                  <dd className="font-medium text-foreground">{profile.intelligence.foundingYear}</dd>
                </div>
              ) : null}

              {profile.readingPeriod ? (
                <div className="pt-3 flex justify-between">
                  <dt className="text-muted-foreground">Reading Window</dt>
                  <dd className="font-medium text-foreground">{profile.readingPeriod}</dd>
                </div>
              ) : null}

              {profile.readingFee ? (
                <div className="pt-3 flex justify-between">
                  <dt className="text-muted-foreground">Application Fee</dt>
                  <dd className="font-medium text-foreground">{profile.readingFee}</dd>
                </div>
              ) : null}

              {profile.payment ? (
                <div className="pt-3 flex justify-between">
                  <dt className="text-muted-foreground">Honorarium / Pay</dt>
                  <dd className="font-medium text-foreground">{profile.payment}</dd>
                </div>
              ) : null}

              {profile.contactEmail ? (
                <div className="pt-3 flex justify-between truncate">
                  <dt className="text-muted-foreground">Contact</dt>
                  <dd className="font-medium text-foreground truncate">{profile.contactEmail}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* Discipline Tags */}
          {profile.genres && profile.genres.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Disciplines & Focus
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.genres.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground capitalize"
                  >
                    {tag.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
