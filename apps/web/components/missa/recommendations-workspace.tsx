"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import type {
  RecommendationMatch,
  ProgramMatch,
} from "@/lib/creator-recommendations";
import { OpportunityBrowseProjectCard } from "@/components/design-system/opportunity-browse-project-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

type Match = RecommendationMatch & { opportunity: OpportunityBrowseProjection };
type Feed = {
  items: Match[];
  programs: ProgramMatch[];
  total: number;
  contextKey: string;
  notes: string[];
};
type Choices = {
  goals: { id: string; title: string; workId: string | null }[];
  works: { id: string; title: string }[];
};
const reasons = [
  ["not-relevant", "Not relevant to this plan"],
  ["wrong-discipline", "Wrong discipline"],
  ["not-eligible", "I’m not eligible"],
  ["fee", "Application fee"],
  ["timing", "The timing doesn’t work"],
  ["already-applied", "I already applied"],
  ["other", "Something else"],
] as const;
export function RecommendationsWorkspace({
  goalId: fixedGoal,
  compact = false,
}: {
  goalId?: string;
  compact?: boolean;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    goalId = fixedGoal ?? params.get("goal") ?? "",
    workId = params.get("work") ?? "",
    mode = !compact && params.get("mode") === "plan" ? "plan" : "now",
    hidden = !compact && params.get("dismissed") === "1",
    page = Math.max(0, Number(params.get("page")) || 0);
  const [choices, setChoices] = useState<Choices>({ goals: [], works: [] }),
    [data, setData] = useState<Feed | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Match | null>(null),
    [reason, setReason] = useState("not-relevant"),
    [saveError, setSaveError] = useState(""),
    [undo, setUndo] = useState<{
      item: Match;
      reason: string;
      revision: number;
    } | null>(null);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    void fetch("/api/me/recommendations?choices=1")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        setChoices(await r.json());
      })
      .catch(() =>
        setError(
          "Your goals and Library could not load. Refresh to try again.",
        ),
      );
  }, [refresh]);
  useEffect(() => {
    const c = new AbortController();
    // Refresh the recommendation request when route filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external fetch synchronizes loading state
    setLoading(true);
    setError("");
    setUndo(null);
    const p = new URLSearchParams({
      mode,
      page: String(compact ? 0 : page),
      dismissed: hidden ? "1" : "0",
    });
    if (goalId) p.set("goal", goalId);
    if (workId && !fixedGoal) p.set("work", workId);
    void fetch(`/api/me/recommendations?${p}`, {
      signal: c.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [goalId, workId, mode, page, hidden, refresh, compact, fixedGoal]);
  function change(key: string, value: string) {
    const p = new URLSearchParams(params);
    p.delete("page");
    if (value) p.set(key, value);
    else p.delete(key);
    if (key === "goal") p.delete("work");
    if (key === "mode") p.delete("dismissed");
    router.replace(`/opportunities/for-you?${p}`, { scroll: false });
  }
  async function feedback(
    item: Match,
    hide: boolean,
    revision: number,
    why: string,
  ) {
    const body = {
      opportunityId: item.id,
      ...(goalId ? { goalId } : {}),
      ...(!fixedGoal && workId ? { workId } : {}),
      revision,
      hidden: hide,
      reason: why,
    };
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setSaveError("");
    try {
      const r = await fetch("/api/me/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": pending.current.key,
        },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      pending.current = null;
      setSelected(null);
      if (hide || hidden)
        setData((current) =>
          current
            ? {
                ...current,
                total: Math.max(0, current.total - 1),
                items: current.items.filter((i) => i.id !== item.id),
              }
            : current,
        );
      if (hide) setUndo({ item, reason: why, revision: d.receipt.revision });
      else {
        setUndo(null);
        if (!hidden)
          setData((current) =>
            current
              ? {
                  ...current,
                  total: current.total + 1,
                  items: [
                    { ...item, feedbackRevision: d.receipt.revision },
                    ...current.items,
                  ],
                }
              : current,
          );
      }
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Feedback could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  const activeGoal = choices.goals.find((g) => g.id === goalId),
    visibleItems = compact ? data?.items.slice(0, 3) : data?.items;
  return (
    <section
      className="space-y-6"
      aria-label={
        compact ? "Recommendations for this goal" : "Your recommendations"
      }
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {compact ? (
            <h2 className="font-sans text-2xl font-semibold">For this goal</h2>
          ) : (
            <>
              <Link
                href="/opportunities"
                className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-primary"
              >
                <ArrowLeft className="size-4" />
                All opportunities
              </Link>
              <h1 className="font-sans text-3xl font-semibold tracking-tight">
                For you
              </h1>
            </>
          )}
        </div>
        <Link
          href={
            compact
              ? `/opportunities/for-you?goal=${encodeURIComponent(goalId)}`
              : "/profile"
          }
          className={buttonVariants({ variant: "ghost" })}
        >
          {compact ? "See all suggestions" : "Edit preferences"}
          <ArrowRight />
        </Link>
      </header>
      {!compact ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="recommendation-goal">Goal</FieldLabel>
              <NativeSelect
                id="recommendation-goal"
                disabled={busy}
                value={goalId}
                onChange={(e) => change("goal", e.target.value)}
              >
                <option value="">My preferences and active goals</option>
                {choices.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="recommendation-work">
                Project or work
              </FieldLabel>
              <NativeSelect
                id="recommendation-work"
                value={activeGoal?.workId ?? workId}
                disabled={Boolean(activeGoal?.workId) || busy}
                onChange={(e) => change("work", e.target.value)}
              >
                <option value="">All my work</option>
                {choices.works.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
            <Tabs value={mode} onValueChange={(v) => change("mode", String(v))}>
              <TabsList variant="line" className="min-h-12 gap-5">
                <TabsTrigger value="now" className="min-h-11">
                  Apply now
                </TabsTrigger>
                <TabsTrigger value="plan" className="min-h-11">
                  Plan ahead
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "now" ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => change("dismissed", hidden ? "" : "1")}
              >
                <EyeOff />
                {hidden ? "Back to suggestions" : "Hidden suggestions"}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
          <Button variant="ghost" onClick={() => setRefresh((v) => v + 1)}>
            Try again
          </Button>
        </div>
      ) : null}
      {undo ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 text-sm"
        >
          <span>Suggestion hidden for this plan.</span>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void feedback(undo.item, false, undo.revision, undo.reason)
            }
          >
            <RotateCcw />
            Undo
          </Button>
        </div>
      ) : null}
      {saveError && !selected ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
      {loading ? (
        <div
          role="status"
          aria-label="Finding recommendations"
          className="grid gap-5 md:grid-cols-3"
        >
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : data ? (
        <>
          {data.notes.length ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              {data.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : null}
          {!compact ? (
            <p className="text-xs text-muted-foreground">
              {data.total.toLocaleString()}{" "}
              {mode === "plan"
                ? "programs"
                : hidden
                  ? "hidden suggestions"
                  : "suggestions"}
            </p>
          ) : null}
          {mode === "plan" && !compact ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.programs.map((p) => (
                <Link
                  key={p.id}
                  href={`/following?program=${encodeURIComponent(p.id)}`}
                  className="flex min-h-48 flex-col gap-4 rounded-xl border border-border p-5 hover:border-primary"
                >
                  <span className="text-sm text-muted-foreground">
                    {p.organizationName}
                  </span>
                  <h2 className="font-heading text-2xl leading-tight break-words">
                    {p.name}
                  </h2>
                  <span className="mt-auto flex items-center justify-between gap-3 text-sm text-primary">
                    {p.openCalls
                      ? "View current calls"
                      : "Follow the next round"}
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleItems?.map((item) => (
                <div key={item.id} className="min-w-0 space-y-2">
                  <OpportunityBrowseProjectCard
                    item={item.opportunity}
                    signedIn
                  />
                  <div className="flex items-start justify-between gap-2">
                    <Collapsible className="min-w-0 flex-1">
                      <CollapsibleTrigger
                        render={
                          <Button
                            variant="ghost"
                            className="max-w-full justify-between text-start whitespace-normal"
                          />
                        }
                      >
                        {item.reasons[0]?.label ?? "Why it’s here"}
                        <ChevronDown className="shrink-0" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 px-3 py-2 text-xs text-muted-foreground">
                        {item.reasons.slice(1).map((r) => (
                          <p key={`${r.kind}:${r.label}`}>{r.label}</p>
                        ))}
                        {item.checks.map((c) => (
                          <p key={c}>{c}</p>
                        ))}
                        <Link
                          className="inline-block min-h-8 text-primary underline underline-offset-4"
                          href={`/opportunities/${encodeURIComponent(item.id)}`}
                        >
                          Review requirements
                        </Link>
                      </CollapsibleContent>
                    </Collapsible>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      aria-label={
                        hidden ? `Restore ${item.title}` : `Hide ${item.title}`
                      }
                      onClick={() => {
                        if (hidden)
                          void feedback(
                            item,
                            false,
                            item.feedbackRevision,
                            "not-relevant",
                          );
                        else {
                          setSelected(item);
                          setReason("not-relevant");
                          setSaveError("");
                        }
                      }}
                    >
                      {hidden ? <RotateCcw /> : <EyeOff />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!data.items.length && !data.programs.length ? (
            <div className="space-y-4 border-y border-border py-10">
              <h3 className="font-sans text-xl font-semibold">
                {hidden
                  ? "No hidden suggestions"
                  : mode === "plan"
                    ? "No programs match this plan yet"
                    : "No open calls match this plan right now"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hidden
                  ? "Suggestions you hide will appear here."
                  : "Your saved goals stay in place. You can explore other programs or adjust your preferences."}
              </p>
              <Link
                href={
                  goalId
                    ? `/goals?goal=${encodeURIComponent(goalId)}`
                    : "/opportunities"
                }
                className={buttonVariants({ variant: "outline" })}
              >
                {goalId ? "Open goal" : "Explore opportunities"}
                <ArrowRight />
              </Link>
            </div>
          ) : null}
          {!compact && (data.total > 24 || page > 0) ? (
            <nav
              aria-label="Recommendation pages"
              className="flex items-center justify-between gap-3"
            >
              <Button
                variant="outline"
                disabled={!page || busy}
                onClick={() => change("page", String(page - 1))}
              >
                <ArrowLeft />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {data.total
                  ? `${page * 24 + 1}–${Math.min((page + 1) * 24, data.total)}`
                  : "No more suggestions"}
              </span>
              <Button
                variant="outline"
                disabled={(page + 1) * 24 >= data.total || busy}
                onClick={() => change("page", String(page + 1))}
              >
                Next
                <ArrowRight />
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(v) => {
          if (!v && !busy) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide this suggestion?</DialogTitle>
            <DialogDescription>{selected?.title}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selected)
                void feedback(
                  selected,
                  true,
                  selected.feedbackRevision,
                  reason,
                );
            }}
            className="space-y-5"
          >
            <Field>
              <FieldLabel htmlFor="recommendation-reason">
                What didn’t fit?
              </FieldLabel>
              <NativeSelect
                id="recommendation-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {reasons.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <p className="text-sm text-muted-foreground">
              Hidden for this plan. You can restore it from Hidden suggestions.
            </p>
            {saveError ? (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Hide suggestion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
