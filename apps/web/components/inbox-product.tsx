"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CheckCheck,
  CircleCheck,
  FileCheck2,
  Inbox,
  SearchCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmailReviewQueue } from "@/components/email-review-queue";
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel";
import type { CreatorNotificationPreferences } from "@missa/radar-adapters";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ApplicationReminders } from "@/components/missa/application-reminders";
import { CountBadge } from "@/components/missa/count-badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export type InboxProductGroup =
  "attention" | "changes" | "submissions" | "discovery";

export type InboxProductItem = {
  id: string;
  kind: string;
  group: InboxProductGroup;
  category: string;
  title: string;
  summary: string;
  reason: string;
  createdAt: string;
  unread: boolean;
  revision?: number;
  reminderId?: string;
  actionHref: string;
  actionLabel: string;
};

type InboxView = "briefing" | "email" | "reminders";

const groups: Array<{
  id: InboxProductGroup;
  title: string;
  description: string;
}> = [
  {
    id: "attention",
    title: "Needs your attention",
    description:
      "Decisions, reminders, and submission actions that deserve a closer look.",
  },
  {
    id: "changes",
    title: "Changed in your Tracker",
    description:
      "Material changes to Opportunities you are already considering.",
  },
  {
    id: "submissions",
    title: "Submission record",
    description:
      "Receipts and decisions remain attached to your private submission history.",
  },
  {
    id: "discovery",
    title: "Saved searches and following",
    description:
      "Quieter discovery from preferences and Organizations you chose to follow.",
  },
];

function iconFor(item: InboxProductItem) {
  if (item.kind === "submission-decision")
    return <CircleCheck aria-hidden="true" />;
  if (item.kind === "submission-receipt")
    return <FileCheck2 aria-hidden="true" />;
  if (item.kind === "deadline-reminder" || item.kind === "closing-soon")
    return <CalendarClock aria-hidden="true" />;
  if (item.group === "changes") return <BellRing aria-hidden="true" />;
  if (item.group === "discovery") return <SearchCheck aria-hidden="true" />;
  return <Inbox aria-hidden="true" />;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded update";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function InboxProduct({
  initialItems,
  initialPreferences,
  initialView = "briefing",
}: {
  initialItems: InboxProductItem[];
  initialPreferences?: CreatorNotificationPreferences;
  initialView?: InboxView;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<InboxView>(initialView);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const revealSettings = () => {
      if (window.location.hash === "#notification-preferences-title")
        setSettingsOpen(true);
    };
    revealSettings();
    window.addEventListener("hashchange", revealSettings);
    return () => window.removeEventListener("hashchange", revealSettings);
  }, []);
  // Server refreshes replace these props while this component owns local read state.
  // Keep the synchronization explicit rather than deriving mutable state from props.
  useEffect(() => {
    const timer = window.setTimeout(() => setItems(initialItems), 0);
    return () => window.clearTimeout(timer);
  }, [initialItems]);
  useEffect(() => {
    const timer = window.setTimeout(() => setView(initialView), 0);
    return () => window.clearTimeout(timer);
  }, [initialView]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [router]);
  const unreadCount = items.filter((item) => item.unread).length;

  const grouped = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        items: items.filter((item) => item.group === group.id),
      })),
    [items],
  );
  const attentionCount =
    grouped.find((group) => group.id === "attention")?.items.length ?? 0;

  function changeView(next: InboxView) {
    setView(next);
    setStatus("");
    const query = next === "briefing" ? "" : `?view=${next}`;
    router.replace(`/inbox${query}`, { scroll: false });
  }

  async function markRead(ids?: string[]) {
    const affected = ids
      ? new Set(ids)
      : new Set(items.filter((item) => item.unread).map((item) => item.id));
    if (!affected.size) return true;
    const previous = items;
    setItems((current) =>
      current.map((item) =>
        affected.has(item.id) ? { ...item, unread: false } : item,
      ),
    );
    setBusy(true);
    try {
      const affectedItems = items.filter((item) => affected.has(item.id));
      const response = await fetch("/api/me/inbox/read", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(affectedItems.every((item) => item.revision)
            ? { "Idempotency-Key": crypto.randomUUID() }
            : {}),
        },
        body: JSON.stringify(
          ids
            ? {
                ids,
                items: affectedItems.map(({ id, revision }) => ({
                  id,
                  revision,
                })),
              }
            : {
                all: true,
                items: affectedItems.map(({ id, revision }) => ({
                  id,
                  revision,
                })),
              },
        ),
      });
      if (!response.ok) throw new Error("read-state-failed");
      setStatus(
        ids ? "Update marked as read." : "All Inbox updates marked as read.",
      );
      return true;
    } catch {
      setItems(previous);
      setStatus(
        "We could not update the read state. Your Inbox is otherwise unchanged.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openItem(item: InboxProductItem) {
    if (item.unread) await markRead([item.id]);
    router.push(item.actionHref);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="font-sans text-3xl font-semibold tracking-tight">
              Inbox
            </h1>
            <p className="mt-2 text-muted-foreground">
              Decisions, reminders and changes connected to your Missa work.
            </p>
          </div>
          {initialPreferences ? (
            <CollapsibleTrigger
              render={<Button variant="outline" aria-expanded={settingsOpen} />}
            >
              <BellRing />
              Notification settings
            </CollapsibleTrigger>
          ) : null}
        </header>
        {initialPreferences ? (
          <CollapsibleContent className="pt-6">
            <NotificationPreferencesPanel initial={initialPreferences} />
          </CollapsibleContent>
        ) : null}
      </Collapsible>
      <Tabs
        value={view}
        onValueChange={(v) => changeView(v as InboxView)}
        className="gap-8"
      >
        <TabsList
          variant="section"
          size="responsive"
          aria-label="Inbox views"
          className="max-w-full overflow-x-auto"
        >
          <TabsTrigger value="briefing" size="touch">
            Briefing
            {unreadCount ? (
              <CountBadge count={unreadCount} label="unread updates" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="reminders" size="touch">
            Reminders
          </TabsTrigger>
          <TabsTrigger value="email" size="touch">
            Email review
          </TabsTrigger>
        </TabsList>
        <TabsContent value={view}>
          {view === "email" ? (
            <EmailReviewQueue mode="desk" />
          ) : view === "reminders" ? (
            <ApplicationReminders />
          ) : (
            <div className="space-y-12">
              {!items.length ? (
                <Empty variant="bordered" size="spacious">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Check />
                    </EmptyMedia>
                    <EmptyTitle role="heading" aria-level={2}>
                      Nothing needs your attention right now
                    </EmptyTitle>
                    <EmptyDescription>
                      Decisions, material Opportunity changes and reminders tied
                      to your account will appear here. An empty Inbox does not
                      change anything in Tracker.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="sm:flex-row sm:justify-center">
                    <Button onClick={() => router.push("/opportunities")}>
                      Browse Opportunities
                      <ArrowRight />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => changeView("reminders")}
                    >
                      Review reminders
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <>
                  <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
                    <div className="max-w-2xl">
                      <h2 className="font-sans text-2xl font-semibold tracking-tight">
                        Your Missa briefing
                      </h2>
                      <p className="mt-2 text-muted-foreground">
                        {attentionCount
                          ? `${attentionCount} ${attentionCount === 1 ? "item needs" : "items need"} your attention. Quieter updates follow.`
                          : "Nothing needs action. Your recent updates remain below."}
                      </p>
                    </div>
                    {unreadCount ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        aria-busy={busy}
                        onClick={() => void markRead()}
                      >
                        <CheckCheck />
                        Mark all read
                      </Button>
                    ) : null}
                  </header>
                  {!attentionCount ? (
                    <section
                      aria-labelledby="inbox-attention"
                      className="space-y-2"
                    >
                      <h3
                        id="inbox-attention"
                        className="font-sans text-lg font-semibold"
                      >
                        Needs attention
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Nothing here requires action. Your other account updates
                        remain grouped below.
                      </p>
                    </section>
                  ) : null}
                  {grouped.map((group) =>
                    group.items.length ? (
                    <section
                      key={group.id}
                      aria-labelledby={`inbox-${group.id}`}
                      className="space-y-4"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="max-w-2xl">
                          <h3
                            id={`inbox-${group.id}`}
                            className="font-sans text-lg font-semibold"
                          >
                            {group.id === "attention"
                              ? "Needs attention"
                              : group.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {group.description}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {group.items.length}{" "}
                          {group.items.length === 1 ? "update" : "updates"}
                        </span>
                      </div>
                      <div className="divide-y divide-border border-y border-border">
                        {group.items.map((item) => (
                          <article
                            key={item.id}
                            className={`grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-3 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5 ${item.unread ? "bg-secondary" : ""}`}
                          >
                            <span className="mt-1 shrink-0 text-primary">
                              {iconFor(item)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span>{item.category}</span>
                                <time dateTime={item.createdAt}>
                                  {dateLabel(item.createdAt)}
                                </time>
                              </div>
                              <button
                                className="text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                                onClick={() => void openItem(item)}
                                aria-label={`${item.actionLabel}: ${item.title}`}
                              >
                                <span className="block font-sans text-lg font-semibold">
                                  {item.title}
                                </span>
                                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                                  {item.summary}
                                </span>
                              </button>
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  <span className="font-medium text-foreground">
                                    Why you&apos;re seeing this:{" "}
                                  </span>
                                  {item.reason}
                                </span>
                                {item.reminderId ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setView("reminders");
                                      router.replace(
                                        `/inbox?view=reminders&reminder=${encodeURIComponent(item.reminderId!)}`,
                                        { scroll: false },
                                      );
                                    }}
                                  >
                                    Remind me later
                                  </Button>
                                ) : null}
                                {item.unread ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => void markRead([item.id])}
                                  >
                                    Mark read
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="col-start-2 justify-self-start sm:col-start-3 sm:row-start-1 sm:self-center sm:justify-self-end"
                              onClick={() => void openItem(item)}
                            >
                              {item.actionLabel}
                              <ArrowRight />
                            </Button>
                          </article>
                        ))}
                      </div>
                    </section>
                    ) : null,
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {status}
      </p>
    </div>
  );
}
