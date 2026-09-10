"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ApplicationLabels } from "./application-labels";
import type {
  FollowKind,
  FollowTarget,
  FollowDetail,
} from "@/lib/creator-following";
import { applicationDate } from "@/lib/application-workspace-types";
import { toast } from "sonner";

const label = (s: string) =>
  s
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/^./, (v) => v.toUpperCase());
export function FollowingWorkspace() {
  const params = useSearchParams(),
    router = useRouter();
  const [view, setView] = useState("following"),
    [kind, setKind] = useState<FollowKind>("organization"),
    [query, setQuery] = useState(""),
    [discipline, setDiscipline] = useState(""),
    [page, setPage] = useState(0);
  const [data, setData] = useState<{
      items: FollowTarget[];
      total: number;
    } | null>(null),
    [disciplines, setDisciplines] = useState<
      { value: string; label: string }[]
    >([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0);
  const selection = params.get("program")
    ? { kind: "program" as const, id: params.get("program")! }
    : params.get("organization")
      ? { kind: "organization" as const, id: params.get("organization")! }
      : null;
  useEffect(() => {
    void fetch("/api/me/goals?disciplines=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setDisciplines(d.disciplines);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const p = new URLSearchParams({
        kind,
        q: query,
        page: String(page),
        followed: view === "following" ? "1" : "0",
      });
      if (discipline) p.set("discipline", discipline);
      void fetch(`/api/me/following?${p}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (r) => {
          if (!r.ok) throw new Error();
          setData(await r.json());
        })
        .catch((e) => {
          if (e.name !== "AbortError")
            setError(
              "These organizations and programs could not load. Try again.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [view, kind, query, discipline, page, refresh]);
  function open(item: { kind: FollowKind; id: string }) {
    router.push(`/following?${item.kind}=${encodeURIComponent(item.id)}`, {
      scroll: false,
    });
  }
  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-12" id="main-content">
      <header>
        <h1 className="font-sans text-3xl font-semibold tracking-tight">
          Following
        </h1>
        <p className="mt-2 text-muted-foreground">
          Organizations and programs you want to hear from.
        </p>
      </header>
      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(String(v));
          setPage(0);
        }}
        className="gap-6"
      >
        <TabsList variant="line" className="min-h-12 gap-6">
          <TabsTrigger value="following" className="min-h-11 px-1">
            Following
          </TabsTrigger>
          <TabsTrigger value="explore" className="min-h-11 px-1">
            Explore
          </TabsTrigger>
        </TabsList>
        <TabsContent value={view} className="space-y-6">
          <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
            <Field className="col-span-2 min-w-0 flex-1">
              <FieldLabel htmlFor="following-search" className="sr-only">
                Find an organization or program
              </FieldLabel>
              <Input
                id="following-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={
                  kind === "organization"
                    ? "Find an organization"
                    : "Find a prize or program"
                }
              />
            </Field>
            <Field className="min-w-0 sm:w-auto">
              <FieldLabel htmlFor="following-kind" className="sr-only">
                Show
              </FieldLabel>
              <NativeSelect
                id="following-kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as FollowKind);
                  setPage(0);
                }}
              >
                <option value="organization">Organizations</option>
                <option value="program">Programs</option>
              </NativeSelect>
            </Field>
            <Field className="min-w-0 sm:w-auto">
              <FieldLabel htmlFor="following-discipline" className="sr-only">
                Discipline
              </FieldLabel>
              <NativeSelect
                id="following-discipline"
                value={discipline}
                onChange={(e) => {
                  setDiscipline(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All disciplines</option>
                {disciplines.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {error ? (
            <div role="alert" className="text-sm text-destructive">
              {error}
              <Button variant="ghost" onClick={() => setRefresh((v) => v + 1)}>
                Try again
              </Button>
            </div>
          ) : null}
          {loading ? (
            <div
              role="status"
              aria-label="Loading Following"
              className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            >
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </div>
          ) : data ? (
            <>
              <p className="text-xs text-muted-foreground">
                {data.total.toLocaleString()}{" "}
                {kind === "program" ? "programs" : "organizations"}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Open ${item.name}`}
                    onClick={() => open(item)}
                    className="flex min-h-56 flex-col items-start gap-5 rounded-xl border border-border bg-card p-5 text-start outline-offset-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <Avatar className="size-12">
                        <AvatarFallback className="bg-secondary font-heading text-xl text-primary">
                          {item.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {item.followed ? (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Check className="size-3" />
                          Following
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-heading text-2xl leading-tight break-words">
                        {item.name}
                      </h2>
                      {item.organizationName ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.organizationName}
                        </p>
                      ) : item.country ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.country}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-auto flex w-full items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                      <span>
                        {item.openCalls
                          ? `${item.openCalls} open ${item.openCalls === 1 ? "call" : "calls"}`
                          : "No open call listed"}
                      </span>
                      <ArrowRight className="size-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
              {!data.items.length ? (
                <section className="space-y-4 border-y border-border py-12">
                  <Search className="size-8 text-primary" />
                  <h2 className="font-sans text-xl font-semibold">
                    {query || discipline
                      ? "No matches here yet"
                      : view === "following"
                        ? `Which ${kind === "program" ? "programs" : "organizations"} are on your list?`
                        : "No records found"}
                  </h2>
                  <p className="max-w-lg text-sm text-muted-foreground">
                    {view === "following" && !query && !discipline
                      ? "Follow a favorite to hear when a confirmed call opens. You can follow it between application rounds."
                      : "Try another name or discipline."}
                  </p>
                  {view === "following" ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setView("explore");
                        setPage(0);
                      }}
                    >
                      Find {kind === "program" ? "programs" : "organizations"}
                      <ArrowRight />
                    </Button>
                  ) : null}
                </section>
              ) : null}
              {data.total > 24 ? (
                <nav
                  aria-label="Following pages"
                  className="flex items-center justify-between gap-3"
                >
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((v) => v - 1)}
                  >
                    <ArrowLeft />
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page * 24 + 1}–{Math.min((page + 1) * 24, data.total)} of{" "}
                    {data.total.toLocaleString()}
                  </span>
                  <Button
                    variant="outline"
                    disabled={(page + 1) * 24 >= data.total}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    Next
                    <ArrowRight />
                  </Button>
                </nav>
              ) : null}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
      {selection ? (
        <FollowingDetail
          key={`${selection.kind}:${selection.id}`}
          selected={selection}
          onClose={() => router.push("/following", { scroll: false })}
          onOpen={open}
          onChanged={() => setRefresh((v) => v + 1)}
        />
      ) : null}
    </main>
  );
}

function FollowingDetail({
  selected,
  onClose,
  onOpen,
  onChanged,
}: {
  selected: { kind: FollowKind; id: string };
  onClose: () => void;
  onOpen: (item: { kind: FollowKind; id: string }) => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<FollowDetail | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState("");
  const request = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams(selected);
      const r = await fetch(`/api/me/following?${p}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
      setError("");
    } catch {
      setError("This record could not load. Try again.");
    }
  }, [selected.id, selected.kind]);
  useEffect(() => {
    void load();
  }, [load]);
  async function toggle() {
    if (!data) return;
    setBusy(true);
    setSaveError("");
    const signature = JSON.stringify([selected, data.followed, data.revision]);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const response = await fetch("/api/me/following", {
        method: data.followed ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": request.current.key,
          ...(data.followed ? { "If-Match": String(data.revision) } : {}),
        },
        body: JSON.stringify(selected),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      request.current = null;
      setData({
        ...data,
        followed: !data.followed,
        revision: result.receipt.revision,
      });
      onChanged();
      toast.success(data.followed ? "Unfollowed" : `Following ${data.name}`);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Following could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="gap-3 border-b border-border px-6 pt-12 pb-6">
          <SheetTitle className="font-heading text-3xl leading-tight break-words">
            {data?.name ??
              (selected.kind === "program" ? "Program" : "Organization")}
          </SheetTitle>
          <SheetDescription>
            {data?.kind === "program"
              ? data.organizationName
              : "Organization profile"}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-8 px-6 pb-8">
          {error ? (
            <div role="alert" className="text-destructive">
              {error}
              <Button variant="ghost" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          ) : !data ? (
            <div role="status" aria-label="Loading profile">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy}
                  variant={data.followed ? "outline" : "default"}
                  onClick={() => void toggle()}
                >
                  {data.followed ? <Check /> : <Plus />}
                  {busy
                    ? "Saving…"
                    : data.followed
                      ? `Unfollow ${data.kind}`
                      : `Follow ${data.kind}`}
                </Button>
                {data.kind === "organization" ? (
                  <Link
                    href={`/org/${encodeURIComponent(data.id)}`}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    Full profile
                    <ArrowRight />
                  </Link>
                ) : data.organizationId ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      onOpen({ kind: "organization", id: data.organizationId! })
                    }
                  >
                    View organization
                    <ArrowRight />
                  </Button>
                ) : null}
              </div>
              {saveError ? (
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
              {data.kind === "organization" && data.programs.length ? (
                <section className="space-y-3">
                  <h2 className="font-sans text-xl font-semibold">Programs</h2>
                  {data.programs.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-border py-3 text-start text-primary"
                      onClick={() => onOpen({ kind: "program", id: p.id })}
                    >
                      {p.name}
                      <ArrowRight className="size-4 shrink-0" />
                    </button>
                  ))}
                </section>
              ) : null}
              <section className="space-y-4">
                <h2 className="font-sans text-xl font-semibold">
                  {data.kind === "program"
                    ? "Application rounds"
                    : "Calls from this organization"}
                </h2>
                {!data.calls.length ? (
                  <p className="text-sm text-muted-foreground">
                    No public calls are listed yet.
                  </p>
                ) : (
                  data.calls.map((call) => (
                    <Link
                      key={call.id}
                      href={`/opportunities/${encodeURIComponent(call.id)}`}
                      className="block space-y-3 border-b border-border py-4"
                    >
                      <ApplicationLabels
                        kind={label(call.type)}
                        status={
                          call.deadlinePassed
                            ? "Deadline passed"
                            : label(call.status)
                        }
                      />
                      <h3 className="font-sans text-lg font-semibold">
                        {call.title}
                      </h3>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          {call.edition ? `${call.edition} · ` : ""}
                          {call.deadline
                            ? `Listed date ${applicationDate(call.deadline)}`
                            : "Date not listed"}
                        </span>
                        <ArrowRight className="size-4 text-primary" />
                      </div>
                    </Link>
                  ))
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
