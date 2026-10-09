"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { WritingDocument } from "@/lib/writing-document";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  emptyWritingPractice,
  readWritingPractice,
  startPracticeSession,
  endPracticeSession,
  sessionElapsed,
  practiceDay,
  practiceWeek,
  WRITING_STARTING_GUIDES,
  writingStartingGuideDocument,
  type WritingPracticeState,
} from "@/lib/writing-practice";
export type WritingPracticeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountKey: string;
  onCreateTemplate: (
    title: string,
    text: string,
    preparedDocument?: WritingDocument,
  ) => void | Promise<void>;
};
export function WritingPractice(props: WritingPracticeProps) {
  return <PracticeController key={props.accountKey} {...props} />;
}
function PracticeController({
  open,
  onOpenChange,
  accountKey,
  onCreateTemplate,
}: WritingPracticeProps) {
  const key = `missa:writing-sessions:${encodeURIComponent(accountKey)}`;
  const [state, setState] = useState<WritingPracticeState>(() => {
    try {
      return typeof window === "undefined"
        ? emptyWritingPractice()
        : readWritingPractice(window.localStorage.getItem(key));
    } catch {
      return emptyWritingPractice();
    }
  });
  const [storageError, setStorageError] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [open]);
  const update = (next: WritingPracticeState) => {
    setState(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  const active = state.sessions.find((session) => session.endedAt === null);
  const minutes = (milliseconds: number) =>
    `${Math.floor(milliseconds / 60000)}m ${Math.floor(milliseconds / 1000) % 60}s`;
  const backup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "missa-writing-sessions.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const create = async (
    id: (typeof WRITING_STARTING_GUIDES)[number]["id"],
    title: string,
    text: string,
  ) => {
    setCreating(id);
    setError("");
    try {
      await onCreateTemplate(
        title,
        text,
        id === "screenplay" ? writingStartingGuideDocument(id) : undefined,
      );
      onOpenChange(false);
    } catch {
      setError("The new piece could not be created. Try again.");
    } finally {
      setCreating(null);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Writing sessions</SheetTitle>
          <SheetDescription>
            Choose your own pace. Sessions and intentions stay in this browser
            for your account.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <section className="space-y-3">
            <label className="flex items-center gap-3">
              <Checkbox
                checked={state.enabled}
                onCheckedChange={(enabled) =>
                  update({ ...endPracticeSession(state, Date.now()), enabled })
                }
              />
              Keep a personal writing history
            </label>
            {state.enabled ? (
              <>
                <label className="block space-y-2">
                  <span>This week’s intention</span>
                  <Input
                    value={state.intention}
                    maxLength={300}
                    placeholder="Revise one scene, or make room to write…"
                    onChange={(event) =>
                      update({ ...state, intention: event.target.value })
                    }
                  />
                </label>
                <fieldset className="min-w-0 space-y-2">
                  <legend>Rest days</legend>
                  <div className="flex flex-wrap gap-3">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, index) => (
                        <label key={day} className="flex items-center gap-2">
                          <Checkbox
                            checked={state.restDays.includes(index)}
                            onCheckedChange={(checked) =>
                              update({
                                ...state,
                                restDays: checked
                                  ? [...state.restDays, index]
                                  : state.restDays.filter(
                                      (item) => item !== index,
                                    ),
                              })
                            }
                          />
                          {day}
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
                <p className="text-sm text-muted-foreground">
                  Revision counts as time with your work. Rest days are part of
                  the plan.
                </p>
                {active ? (
                  <div className="space-y-2">
                    <p role="status">
                      {active.kind === "revision" ? "Revision" : "Writing"}{" "}
                      session · {minutes(sessionElapsed(active, now))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This timer continues until you end the session, including
                      time away from this tab.
                    </p>
                    <Button
                      size="inline"
                      className="max-w-full whitespace-normal"
                      variant="outline"
                      onClick={() =>
                        update(endPracticeSession(state, Date.now()))
                      }
                    >
                      End session
                    </Button>
                    <Button
                      size="inline"
                      className="max-w-full whitespace-normal"
                      variant="ghost"
                      onClick={() =>
                        update({
                          ...state,
                          sessions: state.sessions.filter(
                            (session) => session.id !== active.id,
                          ),
                        })
                      }
                    >
                      Discard session
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="inline"
                      className="max-w-full whitespace-normal"
                      variant="outline"
                      onClick={() =>
                        update(
                          startPracticeSession(
                            state,
                            "writing",
                            Date.now(),
                            crypto.randomUUID(),
                          ),
                        )
                      }
                    >
                      Start writing session
                    </Button>
                    <Button
                      size="inline"
                      className="max-w-full whitespace-normal"
                      variant="outline"
                      onClick={() =>
                        update(
                          startPracticeSession(
                            state,
                            "revision",
                            Date.now(),
                            crypto.randomUUID(),
                          ),
                        )
                      }
                    >
                      Start revision session
                    </Button>
                  </div>
                )}
                <label className="flex items-center gap-3">
                  <Checkbox
                    checked={state.celebrateMilestones}
                    onCheckedChange={(celebrateMilestones) =>
                      update({ ...state, celebrateMilestones })
                    }
                  />
                  A small celebration when I mark a milestone
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["first-draft", "revision"] as const).map((kind) => (
                    <Button
                      size="inline"
                      className="max-w-full whitespace-normal"
                      key={kind}
                      variant="ghost"
                      onClick={() => {
                        if (state.celebrateMilestones)
                          toast.success(
                            kind === "first-draft"
                              ? "One draft finished. Well done."
                              : "A revision finished. Well done.",
                          );
                        update({
                          ...state,
                          milestones: [
                            {
                              id: crypto.randomUUID(),
                              kind,
                              day: practiceDay(),
                            },
                            ...state.milestones,
                          ].slice(0, 100),
                        });
                      }}
                    >
                      {kind === "first-draft"
                        ? "Mark a draft finished"
                        : "Mark a revision finished"}
                    </Button>
                  ))}
                </div>
                <section aria-label="This week" className="space-y-2">
                  <h3 className="font-medium">This week</h3>
                  <ul className="space-y-1">
                    {practiceWeek(new Date(now)).map((day) => {
                      const sessions = state.sessions.filter(
                        (session) =>
                          session.day === day && session.endedAt !== null,
                      );
                      const weekday = new Date(`${day}T12:00:00`).getDay();
                      return (
                        <li
                          key={day}
                          className="flex flex-wrap justify-between gap-2 text-sm"
                        >
                          <time dateTime={day}>{day}</time>
                          <span>
                            {sessions.length
                              ? `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"} · ${minutes(sessions.reduce((sum, item) => sum + sessionElapsed(item), 0))}`
                              : state.restDays.includes(weekday)
                                ? "Rest day"
                                : "Open day"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <section className="space-y-2">
                  <h3 className="font-medium">Recent sessions</h3>
                  {state.sessions.filter((session) => session.endedAt !== null)
                    .length ? (
                    <ul className="space-y-2">
                      {state.sessions
                        .filter((session) => session.endedAt !== null)
                        .slice(0, 20)
                        .map((session) => (
                          <li
                            key={session.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span>
                              {session.day} · {session.kind} ·{" "}
                              {minutes(sessionElapsed(session))}
                            </span>
                            <Button
                              size="inline"
                              className="max-w-full whitespace-normal"
                              variant="ghost"

                              aria-label={`Remove ${session.kind} session on ${session.day}`}
                              onClick={() =>
                                update({
                                  ...state,
                                  sessions: state.sessions.filter(
                                    (item) => item.id !== session.id,
                                  ),
                                })
                              }
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Your completed sessions will appear here.
                    </p>
                  )}
                </section>
                {state.milestones.length ? (
                  <section className="space-y-2">
                    <h3 className="font-medium">Milestones you marked</h3>
                    <ul className="space-y-1 text-sm">
                      {state.milestones.slice(0, 10).map((item) => (
                        <li key={item.id}>
                          {item.day} ·{" "}
                          {item.kind === "first-draft"
                            ? "Draft finished"
                            : "Revision finished"}
                          <Button
                            size="inline"
                            className="max-w-full whitespace-normal"
                            variant="ghost"

                            aria-label={`Remove milestone on ${item.day}`}
                            onClick={() =>
                              update({
                                ...state,
                                milestones: state.milestones.filter(
                                  (milestone) => milestone.id !== item.id,
                                ),
                              })
                            }
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <Button
                  size="inline"
                  className="max-w-full whitespace-normal"
                  variant="outline"
                  onClick={backup}
                >
                  Download session backup
                </Button>
              </>
            ) : null}
          </section>
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="font-medium">Start with a guide</h3>
            <p className="text-sm text-muted-foreground">
              Each guide creates a new piece with editable prompts.
            </p>
            {WRITING_STARTING_GUIDES.map((guide) => (
              <div key={guide.id} className="space-y-1">
                <Button
                  size="inline"
                  className="max-w-full whitespace-normal"
                  variant="outline"
                  disabled={creating !== null}
                  onClick={() => void create(guide.id, guide.title, guide.text)}
                >
                  {creating === guide.id
                    ? "Creating…"
                    : `Start ${guide.title.toLowerCase()}`}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {guide.description}
                </p>
              </div>
            ))}
          </section>
          {storageError ? (
            <div role="status" className="space-y-2">
              <p>
                Browser storage is unavailable. Download a backup before closing
                this page.
              </p>
              <Button
                size="inline"
                className="max-w-full whitespace-normal"
                variant="outline"
                onClick={backup}
              >
                Download backup
              </Button>
            </div>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
