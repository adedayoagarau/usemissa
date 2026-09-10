"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Calendar,
  FolderOpen,
  Library,
  Sliders,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TrackerProductItem } from "@/components/tracker-product";

export type CreatorWorkspaceProps = {
  displayName: string;
  onboardingStatus: "not_started" | "in_progress" | "completed" | "skipped";
  practices: string[];
  refinements: string[];
  interests: string[];
  savedOpportunities: TrackerProductItem[];
  libraryCount?: { works: number; books: number };
  organizations?: Array<{ id: string; name: string }>;
};

export function CreatorWorkspace({
  displayName: _displayName,
  onboardingStatus: _onboardingStatus,
  practices,
  refinements,
  interests,
  savedOpportunities,
  libraryCount = { works: 0, books: 0 },
  organizations = [],
}: CreatorWorkspaceProps) {
  const [prepTasks, setPrepTasks] = useState<Record<string, boolean>>({
    eligibility: false,
    materials: false,
    guidelines: false,
  });

  const toggleTask = (key: string) => {
    setPrepTasks((current) => ({ ...current, [key]: !current[key] }));
  };

  const completedTaskCount = Object.values(prepTasks).filter(Boolean).length;
  const primaryOpportunity = savedOpportunities[0];

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-6 py-8 md:py-12">
        {/* Workspace Greeting & Date */}
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            {todayFormatted} · Your Space
          </p>
          <h1 className="mt-2 font-heading text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
            A little progress changes the whole week.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Your work is private here. Pick up one application, one material, or
            one useful next step.
          </p>
        </header>

        {/* Organization switcher banner if user is also an org admin */}
        {organizations.length > 0 && (
          <div className="mb-8 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              You also have access to <strong>{organizations[0].name}</strong>.
            </span>
            <Link
              href={`/workspace?organizationId=${encodeURIComponent(organizations[0].id)}`}
              className="font-medium text-primary hover:underline"
            >
              Switch to Organization Workspace →
            </Link>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column: Priority Next Move */}
          <section className="space-y-6 lg:col-span-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                  Your next move
                </h2>
                {primaryOpportunity && (
                  <span className="text-xs text-muted-foreground">
                    {completedTaskCount}/3 prepared
                  </span>
                )}
              </div>

              {primaryOpportunity ? (
                /* Opportunity Preparation Card */
                <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="border-t-4 border-primary p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
                      <span className="capitalize">
                        {primaryOpportunity.type || "Opportunity"}
                      </span>
                      <span>·</span>
                      <span>
                        {primaryOpportunity.deadline
                          ? `Deadline ${new Date(primaryOpportunity.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : "Deadline rolling or unannounced"}
                      </span>
                    </div>

                    <h3 className="mt-3 font-heading text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                      {primaryOpportunity.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {primaryOpportunity.organizationName ||
                        "Official publisher"}
                    </p>

                    {/* Preparation Checklist */}
                    <div className="mt-6 divide-y divide-border border-y border-border">
                      <label className="flex cursor-pointer items-center gap-3 py-3 text-sm">
                        <Checkbox
                          checked={prepTasks.eligibility}
                          onCheckedChange={() => toggleTask("eligibility")}
                        />
                        <span
                          className={
                            prepTasks.eligibility
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          Review eligibility and submission requirements
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 py-3 text-sm">
                        <Checkbox
                          checked={prepTasks.materials}
                          onCheckedChange={() => toggleTask("materials")}
                        />
                        <span
                          className={
                            prepTasks.materials
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          Select reusable work sample or statement from Library
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 py-3 text-sm">
                        <Checkbox
                          checked={prepTasks.guidelines}
                          onCheckedChange={() => toggleTask("guidelines")}
                        />
                        <span
                          className={
                            prepTasks.guidelines
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          Verify deadline timezone and guidelines before handoff
                        </span>
                        <em className="ml-auto text-xs text-muted-foreground not-italic">
                          Suggested
                        </em>
                      </label>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        className={buttonVariants()}
                        href={`/opportunities/${encodeURIComponent(primaryOpportunity.opportunityId)}`}
                      >
                        Prepare application
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                      <Link
                        className={buttonVariants({ variant: "outline" })}
                        href="/tracker"
                      >
                        Open Tracker
                      </Link>
                    </div>
                  </div>
                </article>
              ) : practices.length > 0 ? (
                /* Matching Recommendations Next Move */
                <article className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
                  <div className="border-t-4 border-primary pt-2">
                    <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                      Curated Discovery
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                      Explore opportunities for {practices.join(" & ")}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Based on your private practice choices (
                      {[...practices, ...refinements].join(" · ")}). Save calls
                      to track deadlines and prepare materials right here.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link className={buttonVariants()} href="/opportunities">
                        Explore matching opportunities
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                      <Link
                        className={buttonVariants({ variant: "outline" })}
                        href="/library"
                      >
                        Add a work to Library
                      </Link>
                    </div>
                  </div>
                </article>
              ) : (
                /* Fresh Slate Next Move */
                <article className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
                  <div className="border-t-4 border-primary pt-2">
                    <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                      Get started
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                      Find your next opportunity
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Missa tracks grants, residencies, fellowships, and open
                      calls with honest deadlines. Set up your practices for
                      tailored browse, or start exploring immediately.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link className={buttonVariants()} href="/opportunities">
                        Browse all opportunities
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                      <Link
                        className={buttonVariants({ variant: "outline" })}
                        href="/onboarding"
                      >
                        Set up practice preferences
                      </Link>
                    </div>
                  </div>
                </article>
              )}
            </div>

            {/* Saved Calls Shortlist (if multiple items saved) */}
            {savedOpportunities.length > 1 && (
              <section className="border-t border-border pt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Saved calls <span>({savedOpportunities.length})</span>
                  </h3>
                  <Link
                    href="/saved"
                    className="text-xs text-primary hover:underline"
                  >
                    View all saved →
                  </Link>
                </div>
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {savedOpportunities.slice(1, 4).map((item) => (
                    <div
                      key={item.opportunityId}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <h4 className="truncate font-medium text-foreground">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {item.organizationName || "Publisher"} ·{" "}
                          {item.deadline
                            ? `Deadline ${new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : "Rolling"}
                        </p>
                      </div>
                      <Link
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
                        })}
                        href={`/opportunities/${encodeURIComponent(item.opportunityId)}`}
                      >
                        Prepare{" "}
                        <ArrowRight aria-hidden="true" className="size-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>

          {/* Sidebar: Preferences & Creative Inventory */}
          <aside className="space-y-6">
            {/* Declared Creative Practices */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sliders className="size-4 text-primary" aria-hidden="true" />
                  Declared preferences
                </h3>
                <Link
                  href="/onboarding"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Edit
                </Link>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
                <div>
                  <strong className="block font-medium text-foreground">
                    Practices:
                  </strong>
                  {practices.length ? (
                    <span>{[...practices, ...refinements].join(" · ")}</span>
                  ) : (
                    <span className="italic">Open to all practices</span>
                  )}
                </div>

                <div>
                  <strong className="block font-medium text-foreground">
                    Opportunities:
                  </strong>
                  {interests.length ? (
                    <span>{interests.join(" · ")}</span>
                  ) : (
                    <span className="italic">
                      Open to all opportunity types
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-4 border-t border-border pt-3 text-[11px] leading-normal text-muted-foreground">
                Private to you. Powers browse ordering without treating private
                choices as public identity.
              </p>
            </section>

            {/* Creative Inventory Summary */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Library className="size-4 text-primary" aria-hidden="true" />
                  Creative inventory
                </h3>
                <Link
                  href="/library"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Library →
                </Link>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Your reusable materials get more useful each time you apply.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg border border-border bg-background p-3">
                  <strong className="block text-2xl font-semibold text-foreground">
                    {libraryCount.works}
                  </strong>
                  <span className="text-xs text-muted-foreground">Works</span>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <strong className="block text-2xl font-semibold text-foreground">
                    {libraryCount.books}
                  </strong>
                  <span className="text-xs text-muted-foreground">Books</span>
                </div>
              </div>
            </section>

            {/* Quick Navigation Links */}
            <nav
              className="rounded-xl border border-border bg-card p-4 text-sm"
              aria-label="Workspace quick links"
            >
              <Link
                href="/saved"
                className="flex items-center justify-between py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Bookmark
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  Saved opportunities
                </span>
                <span className="text-xs">{savedOpportunities.length}</span>
              </Link>
              <Link
                href="/tracker"
                className="flex items-center justify-between border-t border-border py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <FolderOpen
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  Application tracker
                </span>
                <span className="text-xs">→</span>
              </Link>
              <Link
                href="/calendar"
                className="flex items-center justify-between border-t border-border py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Calendar
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  Deadlines calendar
                </span>
                <span className="text-xs">→</span>
              </Link>
            </nav>
          </aside>
        </div>
      </main>
    </div>
  );
}
