"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Target, Check, Bell } from "lucide-react";
import { CreatorShell } from "@/components/creator-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Goal = {
  id: number;
  title: string;
  kind: string;
  target: number;
  done: number;
  date: string;
  next: string;
  paused: boolean;
  influence: boolean;
  cadence: string;
  steps: string[];
  checked: string[];
  watching: string;
};
const initial: Goal[] = [
  {
    id: 1,
    title: "Send my work out 12 times",
    kind: "Submission target",
    target: 12,
    done: 7,
    date: "2026-12-31",
    next: "Review the submission guidelines",
    paused: false,
    influence: true,
    cadence: "Weekly",
    steps: [
      "Choose a piece",
      "Review the submission guidelines",
      "Prepare the final version",
    ],
    checked: ["Choose a piece"],
    watching: "",
  },
  {
    id: 2,
    title: "Apply for the North Coast residency",
    kind: "Specific opportunity",
    target: 1,
    done: 0,
    date: "2027-06-30",
    next: "Prepare a portfolio while you wait",
    paused: false,
    influence: true,
    cadence: "Monthly",
    steps: ["Choose portfolio work", "Draft an artist statement"],
    checked: [],
    watching: "North Coast residency",
  },
  {
    id: 3,
    title: "Work toward my first poetry prize",
    kind: "An ambition",
    target: 1,
    done: 0,
    date: "2026-12-31",
    next: "Build a shortlist of suitable prizes",
    paused: false,
    influence: false,
    cadence: "Weekly",
    steps: [
      "Build a shortlist",
      "Ask someone to read the poems",
      "Prepare one entry",
    ],
    checked: [],
    watching: "",
  },
];
export function GoalsPreview() {
  const dialogOrigin = useRef<HTMLButtonElement | null>(null);
  const [goals, setGoals] = useState(initial);
  const [selected, setSelected] = useState(1);
  const [modal, setModal] = useState<"new" | "check" | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("Submission target");
  const [target, setTarget] = useState("12");
  const [date, setDate] = useState("2026-12-31");
  const [next, setNext] = useState("");
  const [watching, setWatching] = useState("");
  const [cadence, setCadence] = useState("Weekly");
  const [influence, setInfluence] = useState(true);
  const current = goals.find((g) => g.id === selected)!;
  function update(patch: Partial<Goal>) {
    setGoals((gs) =>
      gs.map((g) => (g.id === selected ? { ...g, ...patch } : g)),
    );
  }
  return (
    <CreatorShell email="preview@example.invalid" applicationsPreview>
      <div className="border-b border-border bg-muted px-6 py-3 text-xs text-muted-foreground">
        <Link href="/goals" className="font-semibold underline">Open connected Goals →</Link> · Design preview · Changes reset on
        reload · No reminders are sent
      </div>
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12"
      >
        <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Let’s smash your creative goals together!
            </h1>
          </div>
          <Button
            onClick={() => {
              dialogOrigin.current =
                document.activeElement as HTMLButtonElement;
              setTitle("");
              setNext("");
              setWatching("");
              setModal("new");
            }}
          >
            <Plus aria-hidden="true" />
            New goal
          </Button>
        </header>
        <p role="status" className="mb-4 text-sm text-primary">
          {message}
        </p>
        <div className="space-y-8">
          <section
            aria-label="Your goals"
            className="grid gap-3 md:grid-cols-3"
          >
            <label className="grid gap-2 text-sm md:hidden">
              Choose a goal
              <NativeSelect
                value={String(selected)}
                onChange={(e) => {
                  setSelected(Number(e.target.value));
                  setMessage("");
                }}
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setSelected(g.id);
                  setMessage("");
                }}
                aria-pressed={g.id === selected}
                className={`hidden w-full rounded-xl border p-5 md:block text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${g.id === selected ? "border-primary bg-accent" : "border-border hover:bg-muted"}`}
              >
                <span className="mb-4 block text-xs text-muted-foreground">
                  {g.paused ? "Paused" : g.kind}
                </span>
                <span className="block text-xl font-semibold leading-snug">
                  {g.title}
                </span>
                <span className="mt-4 block text-sm text-muted-foreground">
                  {g.kind === "Submission target"
                    ? `${g.done} of ${g.target} submissions`
                    : g.watching
                      ? "Waiting for the next call"
                      : `${g.checked.length} of ${g.steps.length} preparation steps`}
                </span>
              </button>
            ))}
          </section>
          <section aria-label="Goal details" className="min-w-0">
            <div className="grid overflow-hidden rounded-xl border border-border lg:grid-cols-2">
              <section
                className="flex flex-col bg-primary p-6 text-primary-foreground md:p-8"
                aria-label="Goal progress"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>{current.paused ? "Paused" : current.kind}</span>
                  <span>
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(current.date + "T12:00:00Z"))}
                  </span>
                </div>
                <h2 className="mt-6 max-w-md text-3xl font-semibold leading-tight tracking-tight">
                  {current.title}
                </h2>
                {current.kind === "Submission target" ? (
                  <>
                    <p className="mt-8 flex items-baseline gap-3">
                      <strong className="text-7xl font-semibold tracking-tight">
                        {current.done}
                      </strong>
                      <span className="text-lg">
                        of {current.target} submitted
                      </span>
                    </p>
                    <div
                      className="mt-6 grid grid-cols-6 gap-3"
                      aria-hidden="true"
                    >
                      {Array.from(
                        { length: Math.min(current.target, 24) },
                        (_, i) => (
                          <span
                            key={i}
                            className={`flex aspect-square items-center justify-center rounded-full border border-primary-foreground ${i < Math.round((current.done / current.target) * Math.min(current.target, 24)) ? "bg-primary-foreground text-primary" : "text-primary-foreground"}`}
                          >
                            {i <
                            Math.round(
                              (current.done / current.target) *
                                Math.min(current.target, 24),
                            ) ? (
                              <Check className="size-5" />
                            ) : (
                              <span className="text-sm">
                                {current.target <= 24 ? i + 1 : ""}
                              </span>
                            )}
                          </span>
                        ),
                      )}
                    </div>
                    <div className="sr-only">
                      <Progress
                        aria-label="Submission progress"
                        value={Math.min(
                          100,
                          (current.done / current.target) * 100,
                        )}
                      />
                    </div>
                    <p className="mt-6 text-lg">
                      {Math.max(0, current.target - current.done)} more to reach
                      your goal.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-8 text-5xl font-semibold">
                      {current.checked.length}
                      <span className="text-lg font-normal">
                        {" "}
                        / {current.steps.length} steps
                      </span>
                    </p>
                    <p className="mt-4 text-lg">
                      {current.watching
                        ? "Waiting for the next opening."
                        : "Build your next entry."}
                    </p>
                  </>
                )}
                <Button
                  className="mt-8 self-start"
                  variant="secondary"
                  onClick={() => {
                    update({ paused: !current.paused });
                    setMessage(
                      current.paused ? "Goal resumed." : "Goal paused.",
                    );
                  }}
                >
                  {current.paused ? "Resume goal" : "Pause goal"}
                </Button>
              </section>
              <section
                className="flex flex-col p-6 md:p-8"
                aria-label="Next action"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Up next</h3>
                  <span className="text-sm text-muted-foreground">
                    {current.checked.length}/{current.steps.length} steps done
                  </span>
                </div>
                <p className="mt-6 max-w-md text-2xl font-medium leading-snug">
                  {current.next}
                </p>
                <Button
                  className="mt-6 self-start"
                  disabled={current.paused}
                  onClick={() => {
                    dialogOrigin.current =
                      document.activeElement as HTMLButtonElement;
                    setNext(current.next);
                    setModal("check");
                  }}
                >
                  Check in <ArrowRight aria-hidden="true" />
                </Button>
                <div className="mt-8 border-t border-border">
                  {current.steps.map((step) => (
                    <label
                      key={step}
                      className="flex min-h-16 cursor-pointer items-center gap-3 border-b border-border py-4 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-5 shrink-0 accent-primary"
                        checked={current.checked.includes(step)}
                        onChange={() => {
                          setMessage(
                            current.checked.includes(step)
                              ? "Step reopened."
                              : "Nice work! Another step done.",
                          );
                          update({
                            checked: current.checked.includes(step)
                              ? current.checked.filter((s) => s !== step)
                              : [...current.checked, step],
                          });
                        }}
                      />
                      <span
                        className={
                          current.checked.includes(step)
                            ? "text-muted-foreground line-through"
                            : ""
                        }
                      >
                        {step}
                      </span>
                    </label>
                  ))}
                </div>
                <Link
                  className={`${buttonVariants({ variant: "link" })} mt-6 self-start`}
                  href="/design-system/applications-v2"
                >
                  View applications <ArrowRight aria-hidden="true" />
                </Link>
              </section>
            </div>
            <details className="mt-6 border-b border-border pb-5">
              <summary className="cursor-pointer py-2 text-sm font-medium">
                Reminders &amp; recommendations
              </summary>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <section className="rounded-lg border border-border p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Bell className="size-4" aria-hidden="true" />
                    Check-ins
                  </h3>
                  <label className="mt-4 block text-sm">
                    Check-in frequency
                    <NativeSelect
                      className="mt-2"
                      value={current.cadence}
                      onChange={(e) => update({ cadence: e.target.value })}
                    >
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Off</option>
                    </NativeSelect>
                  </label>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Preview preference only. Delivery time, channel and
                    permission are confirmed before reminders are enabled.
                  </p>
                </section>
                <section className="rounded-lg border border-border p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Target className="size-4" aria-hidden="true" />
                    Recommendations
                  </h3>
                  <label className="mt-4 flex items-start gap-3 text-sm">
                    <input
                      className="mt-1 size-4 accent-primary"
                      type="checkbox"
                      checked={current.influence}
                      onChange={(e) => update({ influence: e.target.checked })}
                    />
                    Use this goal to tailor suggestions
                  </label>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Your discipline, eligibility, budget and available time
                    still matter.
                  </p>
                </section>
              </div>
            </details>
            <section className="mt-8 pt-2">
              <h3 className="text-lg font-semibold">
                {current.watching ? "Following" : "Find an opportunity"}
              </h3>
              {current.watching ? (
                <>
                  <p className="mt-3 font-medium">{current.watching}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next dates unconfirmed · Example recurring program
                  </p>
                  <p className="mt-3 text-sm">
                    We would alert you after the original source confirms a new
                    call. Following a program does not create an application.
                  </p>
                  <Button
                    variant="link"
                    className="mt-3"
                    onClick={() => {
                      update({ watching: "" });
                      setMessage("Program removed from this goal.");
                    }}
                  >
                    Stop following this program
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {current.influence
                      ? "Look for opportunities that fit this goal, then review their requirements before saving."
                      : "Goal-based suggestions are off. You can still explore all opportunities."}
                  </p>
                  <Link
                    className={buttonVariants({ variant: "link" })}
                    href="/opportunities"
                  >
                    Explore opportunities <ArrowRight aria-hidden="true" />
                  </Link>
                </>
              )}
            </section>
            <Link
              className={`${buttonVariants({ variant: "outline" })} mt-8`}
              href="/design-system/applications-v2"
            >
              Go to My applications <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>
        <Dialog
          open={modal !== null}
          onOpenChange={(open) => {
            if (!open) setModal(null);
          }}
        >
          <DialogContent
            finalFocus={dialogOrigin}
            className="max-h-screen overflow-y-auto"
          >
            <DialogTitle>
              {modal === "new"
                ? "What would you like to work toward?"
                : "A moment to check in"}
            </DialogTitle>
            <DialogDescription>
              {modal === "new"
                ? "Pick a goal and your first step."
                : "What would you like to do next?"}
            </DialogDescription>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (modal === "new") {
                  const id = Date.now();
                  setGoals((gs) => [
                    ...gs,
                    {
                      id,
                      title: title.trim(),
                      kind,
                      target: Number(target),
                      done: 0,
                      date,
                      next: next.trim(),
                      paused: false,
                      influence,
                      cadence,
                      steps: [next.trim()],
                      checked: [],
                      watching,
                    },
                  ]);
                  setSelected(id);
                  setMessage("Goal created in this preview.");
                } else {
                  update({ next: next.trim() });
                  setMessage("Check-in saved. Your next step is updated.");
                }
                setModal(null);
              }}
            >
              {modal === "new" && (
                <>
                  <label className="grid gap-2 text-sm">
                    Goal type
                    <NativeSelect
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option>Submission target</option>
                      <option>Specific opportunity</option>
                      <option>An ambition</option>
                    </NativeSelect>
                  </label>
                  <label className="grid gap-2 text-sm">
                    Goal name
                    <Input
                      required
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Send my work out 12 times"
                    />
                  </label>
                  {kind === "Submission target" && (
                    <label className="grid gap-2 text-sm">
                      Number of submissions
                      <Input
                        type="number"
                        required
                        min={1}
                        max={1000}
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                      />
                    </label>
                  )}
                  <label className="grid gap-2 text-sm">
                    Target date
                    <Input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  {kind === "Specific opportunity" && (
                    <label className="grid gap-2 text-sm">
                      Follow a recurring program
                      <NativeSelect
                        value={watching}
                        onChange={(e) => setWatching(e.target.value)}
                      >
                        <option value="">Choose later</option>
                        <option>North Coast residency</option>
                        <option>The Open Page annual award</option>
                      </NativeSelect>
                      <span className="text-xs text-muted-foreground">
                        Fictional program examples. Next dates unconfirmed.
                      </span>
                    </label>
                  )}
                </>
              )}
              <label className="grid gap-2 text-sm">
                {modal === "new" ? "First small step" : "Your next step"}
                <Input
                  required
                  maxLength={180}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Choose three poems to revise"
                />
              </label>
              {modal === "new" && (
                <>
                  <label className="grid gap-2 text-sm">
                    Check-in frequency
                    <NativeSelect
                      value={cadence}
                      onChange={(e) => setCadence(e.target.value)}
                    >
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Off</option>
                    </NativeSelect>
                  </label>
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={influence}
                      onChange={(e) => setInfluence(e.target.checked)}
                    />
                    Use this goal for recommendations
                  </label>
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {modal === "new" ? "Create goal" : "Save check-in"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </CreatorShell>
  );
}
