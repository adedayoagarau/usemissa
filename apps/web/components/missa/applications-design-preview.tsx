"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { ApplicationLabels } from "@/components/missa/application-labels";
import { CreatorShell } from "@/components/creator-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/ui/field";
import { Empty } from "@/components/ui/empty";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type View = "Saved" | "Awaiting responses" | "History";
type Application = {
  id: string;
  title: string;
  organization: string;
  kind: string;
  view: View;
  status: string;
  deadline?: string;
  submitted?: string;
  response?: string;
  checkIn?: string;
  note?: string;
  originalUrl?: string;
};
const TODAY = "2026-09-07";
const SAMPLES: Application[] = [
  {
    id: "a",
    title: "Autumn poetry submissions",
    organization: "The Orchard Review",
    kind: "Publication",
    deadline: "2026-09-14",
    view: "Saved",
    status: "Saved",
  },
  {
    id: "b",
    title: "A month to make something new",
    organization: "North Coast Arts",
    kind: "Residency",
    deadline: "2026-09-30",
    view: "Saved",
    status: "Saved",
  },
  {
    id: "c",
    title:
      "Early-career artist fellowship for collaborative and interdisciplinary projects",
    organization: "Fieldwork Foundation",
    kind: "Fellowship",
    view: "Saved",
    status: "Saved",
  },
  {
    id: "d",
    title: "Summer fiction submissions",
    organization: "Common Ground",
    kind: "Publication",
    submitted: "2026-08-03",
    checkIn: "2026-09-21",
    view: "Awaiting responses",
    status: "Submitted",
  },
  {
    id: "e",
    title: "New voices award",
    organization: "The Open Page",
    kind: "Award",
    submitted: "2026-07-18",
    view: "Awaiting responses",
    status: "In review",
  },
  {
    id: "f",
    title: "Spring poetry submissions",
    organization: "The Orchard Review",
    kind: "Publication",
    submitted: "2026-04-10",
    response: "2026-06-23",
    view: "History",
    status: "Accepted",
  },
  {
    id: "g",
    title: "Studio residency",
    organization: "North Coast Arts",
    kind: "Residency",
    submitted: "2026-04-18",
    response: "2026-06-12",
    view: "History",
    status: "Declined",
  },
];
const VIEWS: View[] = ["Saved", "Awaiting responses", "History"];
function date(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T12:00:00Z`))
    : "Not listed";
}

export function ApplicationsDesignPreview() {
  const [items, setItems] = useState<Application[]>(SAMPLES);
  const [view, setView] = useState<View>("Saved");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>();
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<Application[]>();
  const [task, setTask] = useState<
    "submit" | "editSubmission" | "outcome" | "checkIn" | "note" | "add"
  >();
  const [value, setValue] = useState(TODAY);
  const [outcome, setOutcome] = useState("Accepted");
  const [text, setText] = useState("");
  const [organization, setOrganization] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const pending = useRef(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const current = items.find((item) => item.id === selected);
  const visible = items
    .filter(
      (item) =>
        item.view === view &&
        `${item.title} ${item.organization}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      view === "Saved"
        ? (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")
        : view === "Awaiting responses"
          ? (a.checkIn ?? a.submitted ?? "9999").localeCompare(
              b.checkIn ?? b.submitted ?? "9999",
            )
          : (b.response ?? "0000").localeCompare(a.response ?? "0000"),
    );
  function open(item: Application) {
    setSelected(item.id);
    requestAnimationFrame(() => detailHeading.current?.focus());
  }
  function back() {
    setSelected(undefined);
    requestAnimationFrame(() => searchInput.current?.focus());
  }
  function change(
    item: Application,
    patch: Partial<Application>,
    notice: string,
  ) {
    setUndo(items);
    setItems(
      items.map((record) =>
        record.id === item.id ? { ...record, ...patch } : record,
      ),
    );
    setMessage(notice);
    if (patch.view) setView(patch.view);
  }
  function begin(next: typeof task) {
    setTask(next);
    setError("");
    setValue(
      next === "checkIn"
        ? (current?.checkIn ?? "2026-09-21")
        : next === "editSubmission"
          ? (current?.submitted ?? TODAY)
          : TODAY,
    );
    setText(next === "note" ? (current?.note ?? "") : "");
    setOrganization("");
    setOriginalUrl("");
  }
  async function commit() {
    if (pending.current) return;
    if (task !== "note" && task !== "add" && !value) {
      setError("Choose a date.");
      return;
    }
    if (
      (task === "submit" || task === "editSubmission" || task === "outcome") &&
      value > TODAY
    ) {
      setError("Use today or an earlier date for a recorded event.");
      return;
    }
    if (
      task === "editSubmission" &&
      current?.response &&
      value > current.response
    ) {
      setError("Submission must be on or before the recorded outcome.");
      return;
    }
    if (task === "outcome" && current?.submitted && value < current.submitted) {
      setError("The outcome date cannot be before submission.");
      return;
    }
    if (task === "add" && (!text.trim() || !organization.trim())) {
      setError("Add an opportunity title and organization.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (failNext) {
      setFailNext(false);
      setError(
        "Your change wasn’t saved. Your details are still here—try again.",
      );
      setSaving(false);
      pending.current = false;
      return;
    }
    if (task === "add") {
      const item: Application = {
        id: `manual-${items.length}`,
        title: text.trim(),
        organization: organization.trim(),
        kind: "Added by you",
        originalUrl: originalUrl.trim() || undefined,
        view: "Saved",
        status: "Saved",
      };
      setUndo(items);
      setItems([...items, item]);
      setView("Saved");
      setSelected(item.id);
      setMessage("Added to Saved in this preview.");
    } else if (current) {
      if (task === "submit")
        change(
          current,
          {
            view: "Awaiting responses",
            status: "Submitted",
            submitted: value,
            response: undefined,
          },
          "Submission recorded in this preview.",
        );
      if (task === "editSubmission")
        change(
          current,
          { submitted: value },
          "Submission date corrected in this preview.",
        );
      if (task === "outcome")
        change(
          current,
          {
            view: "History",
            status: outcome,
            response: value,
            checkIn: undefined,
          },
          "Outcome recorded in this preview.",
        );
      if (task === "checkIn")
        change(
          current,
          { checkIn: value },
          "Check-in date saved in this preview. No reminder will be sent.",
        );
      if (task === "note")
        change(current, { note: text }, "Note saved in this preview.");
    }
    setSaving(false);
    pending.current = false;
    setTask(undefined);
  }
  return (
    <CreatorShell email="preview@example.invalid" applicationsPreview>
      <div className="min-h-screen bg-background text-foreground">
        <div className="border-b border-border bg-muted px-5 py-3 text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <p>
              <strong className="text-foreground">Design preview</strong> ·
              Fictional examples · Changes reset on reload · Reference date: 7
              Sep 2026
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setItems(SAMPLES);
                setSelected(undefined);
                setQuery("");
                setUndo(undefined);
                setMessage("");
                setView("Saved");
              }}
            >
              Reset examples
            </Button>
          </div>
        </div>
        <main
          id="main-content"
          className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12"
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                My applications
              </h1>
              <p className="mt-3 text-muted-foreground">
                Saved opportunities, submissions, and what comes next.
              </p>
            </div>
            <Link
              href="/opportunities"
              className={buttonVariants({ variant: "outline" })}
            >
              Find opportunities <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
          <div
            role="status"
            className={`flex flex-wrap items-center gap-3 text-sm text-primary ${message ? "mb-4" : ""}`}
          >
            {message}
            {undo && (
              <Button
                variant="link"
                onClick={() => {
                  setItems(undo);
                  setUndo(undefined);
                  setSelected(undefined);
                  setMessage("Change undone.");
                }}
              >
                Undo
              </Button>
            )}
          </div>
          <section
            aria-label="Goals"
            className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-accent p-5"
          >
            <div>
              <p className="text-sm font-semibold">
                Give your applications a direction.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Set a goal, plan your next step, and make time to check in.
              </p>
            </div>
            <Link
              href="/design-system/goals"
              className={buttonVariants({ variant: "outline" })}
            >
              Explore Goals <ArrowRight aria-hidden="true" />
            </Link>
          </section>
          <Tabs
            value={view}
            onValueChange={(next) => {
              setView(next as View);
              setSelected(undefined);
              setQuery("");
            }}
          >
            <TabsList
              variant="line"
              className="mb-4 h-auto w-full flex-wrap justify-start gap-3 border-b border-border pb-3"
            >
              {VIEWS.map((name) => (
                <TabsTrigger
                  key={name}
                  value={name}
                  className="min-h-11 flex-none px-2"
                >
                  {name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {items.filter((item) => item.view === name).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {[view].map((name) => (
              <TabsContent key={name} value={name}>
                <div className="grid gap-8 xl:grid-cols-2">
                  <section
                    aria-label={`${name} applications`}
                    className={
                      current
                        ? "hidden min-w-0 xl:block"
                        : "min-w-0 xl:col-span-2"
                    }
                  >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Search
                          aria-hidden="true"
                          className="size-4 text-muted-foreground"
                        />
                        <Input
                          ref={searchInput}
                          aria-label="Search applications"
                          className="h-11 max-w-md"
                          placeholder="Search your applications"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </div>
                      <Button variant="ghost" onClick={() => begin("add")}>
                        <Plus aria-hidden="true" />
                        Add from elsewhere
                      </Button>
                    </div>
                    <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {visible.length}{" "}
                        {visible.length === 1 ? "application" : "applications"}
                      </span>
                      <span>
                        {name === "Saved"
                          ? "Your saved opportunities"
                          : name === "History"
                            ? "Recorded outcomes"
                            : "Waiting, at your pace"}
                      </span>
                    </div>
                    {loading ? (
                      <div
                        aria-label="Loading applications"
                        role="status"
                        className="grid gap-5"
                      >
                        {[1, 2, 3].map((id) => (
                          <Skeleton key={id} className="h-24 w-full" />
                        ))}
                        <span className="sr-only">Loading applications</span>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border border-y border-border">
                        {visible.map((item) => (
                          <li key={item.id}>
                            <Button
                              variant="ghost"
                              onClick={() => open(item)}
                              aria-label={`View ${item.title}`}
                              aria-pressed={item.id === selected}
                              className={`h-auto w-full justify-start whitespace-normal rounded-none px-4 py-5 text-left ${selected === item.id ? "bg-muted" : ""}`}
                            >
                              <span className="flex w-full min-w-0 items-center gap-4">
                                <span className="min-w-0 flex-1">
                                  <span className="mb-2 block text-xs font-normal text-muted-foreground">
                                    {item.organization}
                                  </span>
                                  <ApplicationLabels
                                    kind={item.kind}
                                    status={
                                      item.view !== "Saved"
                                        ? item.status
                                        : item.deadline &&
                                            item.deadline >= TODAY &&
                                            item.deadline <= "2026-09-14"
                                          ? "Closing soon"
                                          : undefined
                                    }
                                  />
                                  <span className="block text-lg font-medium leading-snug">
                                    {item.title}
                                  </span>
                                  <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-normal text-muted-foreground">
                                    <span>
                                      {item.view === "Saved"
                                        ? item.deadline
                                          ? `Apply by ${date(item.deadline)}`
                                          : "Deadline not listed"
                                        : item.view === "Awaiting responses"
                                          ? `Submitted ${date(item.submitted)}`
                                          : `${item.status} · ${date(item.response)}`}
                                    </span>
                                    {item.checkIn && (
                                      <span>Check in {date(item.checkIn)}</span>
                                    )}
                                  </span>
                                </span>
                                <ChevronRight
                                  aria-hidden="true"
                                  className="size-4 shrink-0 text-primary"
                                />
                              </span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!loading && !visible.length && (
                      <Empty className="py-16 text-center">
                        <Bookmark
                          aria-hidden="true"
                          className="mx-auto mb-4 size-6 text-primary"
                        />
                        <h2 className="font-heading text-2xl">
                          {query
                            ? "No matching applications"
                            : name === "Saved"
                              ? "Keep your next opportunity here."
                              : name === "Awaiting responses"
                                ? "Nothing waiting for a response."
                                : "Your outcomes will live here."}
                        </h2>
                        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
                          {query
                            ? "Try another title or organization."
                            : "Save an opportunity, then record what happens when you’re ready."}
                        </p>
                        {query ? (
                          <Button variant="link" onClick={() => setQuery("")}>
                            Clear search
                          </Button>
                        ) : (
                          <Link
                            className={buttonVariants({ variant: "link" })}
                            href="/opportunities"
                          >
                            Browse opportunities{" "}
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        )}
                      </Empty>
                    )}
                  </section>
                  {current && (
                    <section
                      aria-label="Application details"
                      className="min-w-0 xl:border-l xl:border-border xl:pl-8"
                    >
                      <Button
                        variant="ghost"
                        className="h-auto min-h-11 max-w-full whitespace-normal text-left"
                        onClick={back}
                      >
                        <ArrowLeft aria-hidden="true" />
                        Back to applications
                      </Button>
                      <p className="mb-3 mt-6 text-sm text-muted-foreground">
                        {current.organization} · {current.kind}
                      </p>
                      <h2
                        ref={detailHeading}
                        tabIndex={-1}
                        className="break-words font-heading text-3xl leading-tight outline-none"
                      >
                        {current.title}
                      </h2>
                      <p
                        className={`mt-3 text-sm font-medium ${current.status === "Accepted" ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {current.status}
                      </p>
                      <dl className="my-7 grid grid-cols-2 gap-5 border-y border-border py-6">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {current.submitted
                              ? "Submitted"
                              : "Application deadline"}
                          </dt>
                          <dd className="mt-2 text-sm">
                            {date(current.submitted ?? current.deadline)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {current.response
                              ? "Outcome recorded"
                              : "Personal check-in"}
                          </dt>
                          <dd className="mt-2 text-sm">
                            {current.response
                              ? date(current.response)
                              : current.checkIn
                                ? date(current.checkIn)
                                : "Not set"}
                          </dd>
                        </div>
                      </dl>
                      {current.view === "Saved" ? (
                        <div className="space-y-3">
                          <Button className="w-full" disabled>
                            Apply on official site{" "}
                            <ArrowUpRight aria-hidden="true" />
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Fictional example—there is no application website.
                            Live entries open the original application page.
                          </p>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => begin("submit")}
                          >
                            I submitted <Check aria-hidden="true" />
                          </Button>
                        </div>
                      ) : current.view === "Awaiting responses" ? (
                        <>
                          <Button
                            className="w-full"
                            onClick={() => begin("outcome")}
                          >
                            Record outcome <ArrowRight aria-hidden="true" />
                          </Button>
                          <p className="mt-5 text-sm text-muted-foreground">
                            Response timing not listed. Set a personal date to
                            check in.
                          </p>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() =>
                            change(
                              current,
                              {
                                view: current.submitted
                                  ? "Awaiting responses"
                                  : "Saved",
                                status: current.submitted
                                  ? "Submitted"
                                  : "Saved",
                                response: undefined,
                              },
                              "Previous stage restored in this preview.",
                            )
                          }
                        >
                          Restore previous stage
                        </Button>
                      )}
                      <div className="mt-6 flex flex-wrap gap-2">
                        {current.view !== "History" && (
                          <Button
                            variant="ghost"
                            onClick={() => begin("checkIn")}
                          >
                            {current.checkIn
                              ? "Edit check-in"
                              : "Set a check-in"}
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => begin("note")}>
                          {current.note ? "Edit note" : "Add a note"}
                        </Button>
                        {current.submitted && (
                          <Button
                            variant="ghost"
                            onClick={() => begin("editSubmission")}
                          >
                            Edit submission date
                          </Button>
                        )}
                        {current.view === "Saved" && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              change(
                                current,
                                { view: "History", status: "Archived" },
                                "Archived in this preview.",
                              )
                            }
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                      {current.note && (
                        <p className="mt-4 whitespace-pre-wrap break-words border-l-2 border-border pl-4 text-sm text-muted-foreground">
                          {current.note}
                        </p>
                      )}
                      {current.submitted && (
                        <div className="mt-8 border-t border-border pt-5">
                          <h3 className="text-sm font-medium">Your record</h3>
                          <p className="mt-3 text-xs text-muted-foreground">
                            Submitted {date(current.submitted)} · Recorded by
                            you
                          </p>
                          {current.response && (
                            <p className="mt-3 text-xs text-muted-foreground">
                              {current.status} {date(current.response)} ·
                              Recorded by you
                            </p>
                          )}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <footer className="mt-12 border-t border-border pt-5 text-xs text-muted-foreground">
            <p>Private to you. Applying happens on the original website.</p>
            <details className="mt-6">
              <summary className="cursor-pointer py-3">
                Preview controls
              </summary>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUndo(items);
                    setItems([]);
                    setSelected(undefined);
                    setMessage("Showing an empty account.");
                  }}
                >
                  Show empty account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 1200);
                  }}
                >
                  Show loading
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFailNext(true);
                    setMessage(
                      "The next save will fail once so you can test retry.",
                    );
                  }}
                >
                  Test a save error
                </Button>
              </div>
            </details>
          </footer>
        </main>
        <Dialog
          open={Boolean(task)}
          onOpenChange={(open) => {
            if (!open && !saving) setTask(undefined);
          }}
        >
          <DialogContent className="max-h-screen overflow-y-auto sm:max-w-md">
            <DialogTitle>
              {task === "submit" || task === "editSubmission"
                ? "When did you submit?"
                : task === "outcome"
                  ? "What did you hear back?"
                  : task === "checkIn"
                    ? "Choose a check-in date"
                    : task === "note"
                      ? "A note for yourself"
                      : "Add an opportunity"}
            </DialogTitle>
            <DialogDescription>
              {task === "add"
                ? "For an opportunity you found outside Missa. Sample entry only."
                : task === "checkIn"
                  ? "A personal date, separate from the publisher’s deadline. No notifications are sent in this preview."
                  : task === "submit"
                    ? "Record the date you sent your application. You can undo this change."
                    : "This updates your private record in this preview."}
            </DialogDescription>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void commit();
              }}
            >
              {task === "outcome" && (
                <Field>
                  <label
                    htmlFor="application-outcome"
                    className="mb-2 block text-sm"
                  >
                    Outcome
                  </label>
                  <NativeSelect
                    id="application-outcome"
                    className="w-full [&_select]:h-11"
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value)}
                  >
                    {["Accepted", "Declined", "Withdrawn"].map((label) => (
                      <option key={label}>{label}</option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              {task === "note" || task === "add" ? (
                <Field>
                  <label
                    htmlFor="application-text"
                    className="mb-2 block text-sm"
                  >
                    {task === "note" ? "Note" : "Opportunity title"}
                  </label>
                  {task === "note" ? (
                    <Textarea
                      id="application-text"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                    />
                  ) : (
                    <Input
                      className="h-11"
                      id="application-text"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                    />
                  )}
                  {task === "add" && (
                    <>
                      <label
                        htmlFor="application-organization"
                        className="mb-2 mt-4 block text-sm"
                      >
                        Organization
                      </label>
                      <Input
                        className="h-11"
                        id="application-organization"
                        value={organization}
                        onChange={(event) =>
                          setOrganization(event.target.value)
                        }
                      />
                      <label
                        htmlFor="application-url"
                        className="mb-2 mt-4 block text-sm"
                      >
                        Original application page (optional)
                      </label>
                      <Input
                        className="h-11"
                        id="application-url"
                        type="url"
                        value={originalUrl}
                        onChange={(event) => setOriginalUrl(event.target.value)}
                        placeholder="https://"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use the organizer’s own page. This preview stores the
                        address only until reload.
                      </p>
                    </>
                  )}
                </Field>
              ) : (
                <Field>
                  <label
                    htmlFor="application-date"
                    className="mb-2 block text-sm"
                  >
                    {task === "checkIn"
                      ? "Check-in date"
                      : task === "submit" || task === "editSubmission"
                        ? "Submission date"
                        : "Outcome date"}
                  </label>
                  <Input
                    className="h-11"
                    id="application-date"
                    type="date"
                    max={task === "checkIn" ? undefined : TODAY}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                  />
                </Field>
              )}
              {error && <Alert variant="destructive">{error}</Alert>}
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  disabled={saving}
                  onClick={() => setTask(undefined)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </CreatorShell>
  );
}
