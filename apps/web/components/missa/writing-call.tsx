"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { PreSubmitCheckList } from "@/components/missa/pre-submit-check";
import type { ApplicationSummary } from "@/lib/application-workspace-types";
import { formatDeadlineLabel } from "@/lib/deadlineLabel";
import type { PreSubmitInput } from "@/lib/pre-submit-check";
import { writingCallChecks, type WritingCallPiece } from "@/lib/writing-call";

/**
 * Writing for a call: the open piece tied to a call in the writer's tracker,
 * with the call's requirements beside the draft and its limits checked on the
 * piece itself. The checks run on this device; the piece is not sent for them.
 */

export type WritingCallDetails = {
  call: {
    opportunityId: string;
    title: string;
    organizationName: string;
    deadline: string | null;
    deadlineKind: string;
    guidelinesUrl: string | null;
    applyUrl: string | null;
  };
  input: PreSubmitInput;
};

export type WritingCallState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; details: WritingCallDetails }
  | { kind: "missing" }
  | { kind: "failed" };

/** Calls still being written for; ones already sent or decided are left out. */
const OPEN_STATUSES = new Set([
  "interested",
  "saved",
  "preparing",
  "draft-started",
  "ready-to-submit",
  "revision-requested",
]);

async function getJson(
  url: string,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const data: unknown = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data:
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {},
    };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

/** The details of the call a piece is written for, loaded when the link changes. */
export function useWritingCall(callId: string | null) {
  const [loaded, setLoaded] = useState<{
    callId: string;
    state: WritingCallState;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!callId) return;
    let cancelled = false;
    void (async () => {
      const result = await getJson(
        `/api/me/writing/calls/${encodeURIComponent(callId)}`,
      );
      if (cancelled) return;
      const details = result.data as WritingCallDetails;
      setLoaded({
        callId,
        state:
          result.ok && details.call && details.input
            ? { kind: "ready", details }
            : result.status === 404
              ? { kind: "missing" }
              : { kind: "failed" },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [callId, attempt]);

  const state: WritingCallState = !callId
    ? { kind: "none" }
    : loaded?.callId === callId
      ? loaded.state
      : { kind: "loading" };
  const retry = useCallback(() => {
    setLoaded(null);
    setAttempt((value) => value + 1);
  }, []);
  return { state, retry };
}

function deadlineText(call: { deadline: string | null; deadlineKind: string }) {
  if (call.deadline) {
    const label = formatDeadlineLabel(call.deadline);
    if (label) return label.label;
  }
  if (call.deadlineKind === "rolling") return "Rolling deadline";
  if (call.deadlineKind === "until-filled") return "Open until filled";
  return "Deadline not listed";
}

function CallPicker({
  linkedId,
  busy,
  onChoose,
}: {
  linkedId: string | null;
  busy: boolean;
  onChoose: (callId: string) => void;
}) {
  const [calls, setCalls] = useState<ApplicationSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getJson("/api/me/applications");
      if (cancelled) return;
      if (result.ok && Array.isArray(result.data.applications)) {
        setFailed(false);
        setCalls(result.data.applications as ApplicationSummary[]);
      } else {
        setFailed(true);
        setCalls([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const open = useMemo(
    () =>
      (calls ?? [])
        .filter((call) => OPEN_STATUSES.has(call.myStatus))
        .sort((a, b) =>
          (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"),
        ),
    [calls],
  );

  if (calls === null)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Loading your calls…
      </p>
    );
  if (failed)
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-destructive">
          Your calls didn’t load. Check your connection and try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCalls(null);
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  if (!open.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No calls in your tracker</EmptyTitle>
          <EmptyDescription>
            Save a call you mean to apply for, and you can write for it here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/opportunities"
            className={buttonVariants({ variant: "outline" })}
          >
            Find calls
          </Link>
        </EmptyContent>
      </Empty>
    );
  return (
    <ItemGroup>
      {open.map((call) => (
        <div role="listitem" key={call.opportunityId}>
          <Item variant="outline" size="sm">
            <ItemContent>
              <ItemTitle>{call.title}</ItemTitle>
              <ItemDescription>
                {call.organizationName} · {deadlineText(call)}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {call.opportunityId === linkedId ? (
                <span className="text-xs text-muted-foreground">
                  Writing for this
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  aria-label={`Write for ${call.title}`}
                  onClick={() => onChoose(call.opportunityId)}
                >
                  Write for this
                </Button>
              )}
            </ItemActions>
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}

export function WritingCall({
  open,
  onOpenChange,
  onClosed,
  callId,
  state,
  onRetry,
  piece,
  onLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  callId: string | null;
  state: WritingCallState;
  onRetry: () => void;
  piece: WritingCallPiece;
  /** Ties the piece to a call, or unties it with null. Resolves true once saved. */
  onLink: (callId: string | null) => Promise<boolean>;
}) {
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const picking = choosing || !callId;

  const checks = useMemo(
    () =>
      // Measured only while the sheet is open; the footer has its own count.
      open && state.kind === "ready"
        ? writingCallChecks(state.details.input, piece)
        : null,
    [open, state, piece],
  );

  async function link(next: string | null) {
    setBusy(true);
    const saved = await onLink(next);
    setBusy(false);
    if (saved) setChoosing(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setChoosing(false);
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        finalFocus={() => {
          onClosed();
          return false;
        }}
      >
        <SheetHeader variant="section">
          <SheetTitle>For a call</SheetTitle>
          <SheetDescription>
            {picking
              ? "Choose a call from your tracker. Its requirements sit beside this piece, and its limits are checked as you write."
              : "This piece is checked against the call as you write. The checks run on this device; your words aren’t sent anywhere for them."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          {picking ? (
            <>
              <CallPicker
                linkedId={callId}
                busy={busy}
                onChoose={(id) => void link(id)}
              />
              {callId ? (
                <Button
                  variant="ghost"
                  className="self-start"
                  onClick={() => setChoosing(false)}
                >
                  Keep the current call
                </Button>
              ) : null}
            </>
          ) : state.kind === "loading" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading the call…
            </p>
          ) : state.kind === "failed" ? (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-sm text-destructive">
                The call didn’t load. Check your connection and try again.
              </p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            </div>
          ) : state.kind === "missing" ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm">
                This call isn’t in your tracker anymore. Choose another, or
                write without one.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setChoosing(true)}>
                  Choose a call
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void link(null)}
                >
                  Write without a call
                </Button>
              </div>
            </div>
          ) : state.kind === "ready" ? (
            <>
              <section
                aria-labelledby="writing-call-title"
                className="space-y-2"
              >
                <h3 id="writing-call-title" className="text-base font-medium">
                  {state.details.call.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {state.details.call.organizationName} ·{" "}
                  {deadlineText(state.details.call)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.details.call.guidelinesUrl ? (
                    <a
                      href={state.details.call.guidelinesUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Guidelines
                      <ExternalLink aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                  {state.details.call.applyUrl ? (
                    <a
                      href={state.details.call.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Apply
                      <ExternalLink aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                  <Link
                    href={`/tracker?application=${encodeURIComponent(state.details.call.opportunityId)}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    In your tracker
                  </Link>
                </div>
              </section>

              {state.details.input.requirements.length ? (
                <section
                  aria-labelledby="writing-call-asks"
                  className="space-y-2"
                >
                  <h3 id="writing-call-asks" className="text-sm font-medium">
                    Your checklist for this call
                  </h3>
                  <ul className="list-disc space-y-1 ps-5 text-sm">
                    {state.details.input.requirements.map((item) => (
                      <li key={item.label} className="break-words">
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section
                aria-labelledby="writing-call-checks"
                className="space-y-1"
              >
                <h3 id="writing-call-checks" className="text-sm font-medium">
                  This piece against the call
                </h3>
                {checks ? <PreSubmitCheckList checks={checks} /> : null}
              </section>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setChoosing(true)}>
                  Change call
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void link(null)}
                >
                  Write without a call
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
