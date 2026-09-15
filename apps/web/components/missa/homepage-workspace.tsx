"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  FolderOpen,
  Target,
  RefreshCw,
} from "lucide-react";
import type { opportunityBrowseResponseSchema } from "@missa/contracts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { GoalSubmissionProgress } from "./goal-submission-progress";
import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import styles from "./homepage-workspace.module.css";

type Opportunity = ReturnType<
  typeof opportunityBrowseResponseSchema.parse
>["items"][number];
type Feature = "portfolio" | "applications" | "notifications" | "goals";
type Theme = "white" | "sage" | "paper" | "mineral" | "night";
const FEATURES = [
  {
    id: "portfolio",
    label: "Portfolio",
    icon: FolderOpen,
    title: "Show what you make.",
    image: "/media/home/generated/feature-studio.webp",
    description:
      "Put your writing, images and audio in one portfolio. Share one link to your work.",
    href: "/profile/portfolio",
    action: "Build your portfolio",
    note: "You decide when to publish.",
  },
  {
    id: "applications",
    label: "Applications",
    icon: CalendarDays,
    title: "Keep your calls together.",
    image: "/media/home/generated/publications.webp",
    description: "Save a call, add a note and see what you have applied for.",
    href: "/tracker",
    action: "Open your Tracker",
    note: "Your notes and application records stay private.",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    title: "Choose your updates.",
    image: "/media/home/generated/community.webp",
    description: "Turn updates for saved calls on or off in your Inbox.",
    href: "/inbox",
    action: "Open your Inbox",
    note: "Change your preferences any time.",
  },
  {
    id: "goals",
    label: "Goals",
    icon: Target,
    title: "Make time for the work.",
    image: "/media/home/generated/feature-studio.webp",
    description: "Set a simple submission target and see your progress.",
    href: "/goals",
    action: "Set a goal",
    note: "This preview does not change your account.",
  },
] as const;
const THEMES: { id: Theme; label: string }[] = [
  { id: "white", label: "White" },
  { id: "sage", label: "Sage" },
  { id: "paper", label: "Paper" },
  { id: "mineral", label: "Mineral" },
  { id: "night", label: "Night" },
];

function isFeature(value: string): value is Feature {
  return FEATURES.some((item) => item.id === value);
}

function DeadlinePreview({
  opportunities,
  failed,
  onRetry,
}: {
  opportunities: Opportunity[] | null;
  failed: boolean;
  onRetry: () => void;
}) {
  const dated =
    opportunities
      ?.filter(
        (item) =>
          item.deadline.kind === "exact" &&
          item.deadline.date &&
          Number.isFinite(Date.parse(item.deadline.date)),
      )
      .sort((a, b) => a.deadline.date!.localeCompare(b.deadline.date!)) ?? [];
  return (
    <div className={styles.deadlines}>
      <div className={styles.previewHeading}>
        <CalendarDays size={22} aria-hidden="true" />
        <h4>Upcoming deadlines</h4>
      </div>
      <p className={styles.sourceLabel}>From the current catalogue</p>
      {failed ? (
        <div role="status" className={styles.dataState}>
          <p>We couldn’t load these deadlines.</p>
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : !opportunities ? (
        <div
          role="status"
          aria-label="Loading deadlines"
          aria-busy="true"
          className={styles.loading}
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : dated.length ? (
        <Table className={styles.deadlineTable}>
          <TableHeader>
            <TableRow>
              <TableHead>Deadline</TableHead>
              <TableHead>Opportunity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dated.slice(0, 3).map((item) => {
              const date = new Date(
                `${item.deadline.date!.slice(0, 10)}T12:00:00Z`,
              );
              return (
                <TableRow key={item.id}>
                  <TableCell className={styles.dateCell}>
                    <time dateTime={item.deadline.date} className="font-mono">
                      <span>
                        {date.toLocaleDateString("en", {
                          month: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                      <strong>{date.getUTCDate()}</strong>
                      <span>{date.getUTCFullYear()}</span>
                    </time>
                  </TableCell>
                  <TableCell className={styles.titleCell}>
                    <Link
                      href={`/opportunities/${encodeURIComponent(item.id)}`}
                    >
                      <span>{item.title}</span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                    {item.organizationName && <p>{item.organizationName}</p>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className={styles.dataState}>
          <p>No dated calls in this selection.</p>
          <Link href="/opportunities">
            Browse opportunities <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      <p className={styles.previewNote}>
        Save a call to keep its deadline in your Tracker.
      </p>
    </div>
  );
}

export function HomepageWorkspace({
  opportunities,
  failed,
  onRetry,
}: {
  opportunities: Opportunity[] | null;
  failed: boolean;
  onRetry: () => void;
}) {
  const [feature, setFeature] = useState<Feature>("portfolio");
  const [theme, setTheme] = useState<Theme>("white");
  const [target, setTarget] = useState(12);
  const [sampleSubmissions, setSampleSubmissions] = useState(0);
  const [reminders, setReminders] = useState(true);
  const [changes, setChanges] = useState(true);
  const [checkins, setCheckins] = useState(true);
  const reduced = useReducedMotion();
  const firstDated = opportunities?.find(
    (item) => item.deadline.kind === "exact" && item.deadline.date,
  );

  return (
    <section
      className={styles.root}
      id="homepage-workspace"
      aria-labelledby="workspace-heading"
    >
      <header className={styles.heading}>
        <h2 id="workspace-heading">
          Find your next call.
          <br />
          <span className="font-heading">Share what you make.</span>
        </h2>
        <p>
          Browse calls, then build a portfolio for the work you want to share.
        </p>
      </header>
      <Tabs
        value={feature}
        onValueChange={(value) => {
          if (isFeature(value)) setFeature(value);
        }}
        className={styles.explorer}
      >
        <TabsList
          aria-label="Explore Missa features"
          className={styles.featureTabs}
        >
          {FEATURES.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className={styles.featureTab}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {FEATURES.map((item) => (
          <TabsContent key={item.id} value={item.id} className={styles.panel}>
            <motion.div
              className={styles.stage}
              data-feature={item.id}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className={styles.featureStory}>
                <div className={styles.featurePhoto}>
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 40vw"
                  />
                </div>
                <div className={styles.featureCopy}>
                  <h3 className="font-heading">{item.title}</h3>
                  <p>{item.description}</p>
                  <Button
                    nativeButton={false}
                    role="link"
                    render={<Link href={item.href} />}
                    className={styles.action}
                  >
                    {item.action}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Button>
                  <p className={styles.featureNote}>{item.note}</p>
                </div>
              </div>
              <div className={styles.productCanvas}>
                <div className={styles.preview}>
                  {item.id === "portfolio" && (
                    <div className={styles.portfolioPreview}>
                      <div className={styles.previewToolbar}>
                        <span>Try a portfolio theme</span>
                        <div
                          role="group"
                          aria-label="Portfolio preview theme"
                          className={styles.themeChoices}
                        >
                          {THEMES.map((option) => (
                            <Button
                              key={option.id}
                              variant="ghost"
                              size="icon"
                              aria-label={`${option.label} theme`}
                              aria-pressed={theme === option.id}
                              onClick={() => setTheme(option.id)}
                              className={styles.themeChoice}
                              data-theme={option.id}
                            >
                              {theme === option.id && (
                                <Check size={15} aria-hidden="true" />
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <CreatorPortfolioStudio
                        key={theme}
                        embedded
                        sampleTheme={theme}
                        sampleWorkLimit={1}
                      />
                    </div>
                  )}
                  {item.id === "applications" && (
                    <DeadlinePreview
                      opportunities={opportunities}
                      failed={failed}
                      onRetry={onRetry}
                    />
                  )}
                  {item.id === "notifications" && (
                    <div className={styles.inboxPreview}>
                      <div className={styles.previewHeading}>
                        <Bell size={22} aria-hidden="true" />
                        <h4>Choose your notifications</h4>
                      </div>
                      <p className={styles.sourceLabel}>
                        Try the switches below
                      </p>
                      <div className={styles.preferences}>
                        <label>
                          <span>
                            <strong>Deadline reminders</strong>
                            <small>For calls in your Tracker</small>
                          </span>
                          <Switch
                            aria-label="Preview deadline reminders"
                            checked={reminders}
                            onCheckedChange={setReminders}
                          />
                        </label>
                        <label>
                          <span>
                            <strong>Opportunity updates</strong>
                            <small>Changes to saved calls</small>
                          </span>
                          <Switch
                            aria-label="Preview opportunity updates"
                            checked={changes}
                            onCheckedChange={setChanges}
                          />
                        </label>
                        <label>
                          <span>
                            <strong>Goal check-ins</strong>
                            <small>A reminder to review your plan</small>
                          </span>
                          <Switch
                            aria-label="Preview goal check-ins"
                            checked={checkins}
                            onCheckedChange={setCheckins}
                          />
                        </label>
                      </div>
                      <div
                        className={styles.notificationResult}
                        aria-live="polite"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={`${reminders}-${changes}-${checkins}`}
                            initial={reduced ? false : { opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduced ? undefined : { opacity: 0 }}
                            transition={{ duration: reduced ? 0 : 0.2 }}
                          >
                            {reminders ? (
                              <>
                                <CalendarDays aria-hidden="true" />
                                <div>
                                  <strong>Reminder preview</strong>
                                  <p>
                                    {firstDated
                                      ? firstDated.title
                                      : "Reminders for your saved opportunities"}
                                  </p>
                                  {firstDated && (
                                    <time dateTime={firstDated.deadline.date}>
                                      Deadline:{" "}
                                      {new Date(
                                        `${firstDated.deadline.date!.slice(0, 10)}T12:00:00Z`,
                                      ).toLocaleDateString("en", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        timeZone: "UTC",
                                      })}
                                    </time>
                                  )}
                                </div>
                              </>
                            ) : changes ? (
                              <>
                                <RefreshCw aria-hidden="true" />
                                <div>
                                  <strong>Opportunity updates selected</strong>
                                  <p>
                                    See changes to dates, fees and requirements.
                                  </p>
                                </div>
                              </>
                            ) : checkins ? (
                              <>
                                <Target aria-hidden="true" />
                                <div>
                                  <strong>Goal check-ins selected</strong>
                                  <p>Review the next step you planned.</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Bell aria-hidden="true" />
                                <div>
                                  <strong>These notifications are off</strong>
                                  <p>Switch one on to see a preview.</p>
                                </div>
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <p className={styles.previewNote}>
                        Preview only. Save your preferences in your Inbox.
                      </p>
                    </div>
                  )}
                  {item.id === "goals" && (
                    <div className={styles.goalPreview}>
                      <div className={styles.goalControls}>
                        <h4>How many submissions?</h4>
                        <div
                          role="group"
                          aria-label="Preview submission target"
                        >
                          {[6, 12, 24].map((count) => (
                            <Button
                              key={count}
                              variant="outline"
                              aria-pressed={target === count}
                              onClick={() => {
                                setTarget(count);
                                setSampleSubmissions((value) =>
                                  Math.min(value, count),
                                );
                              }}
                            >
                              {count}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.goalProgress}>
                        <GoalSubmissionProgress
                          done={sampleSubmissions}
                          target={target}
                        />
                      </div>
                      <div className={styles.goalDemoActions}>
                        <Button
                          onClick={() =>
                            setSampleSubmissions((value) =>
                              Math.min(target, value + 1),
                            )
                          }
                          disabled={sampleSubmissions >= target}
                        >
                          Add a sample submission{" "}
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setSampleSubmissions(0)}
                          disabled={sampleSubmissions === 0}
                        >
                          Reset
                        </Button>
                      </div>
                      <p className={styles.goalPreviewNote}>
                        Try it here. These sample submissions aren’t saved to
                        your account.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
