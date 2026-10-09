"use client";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RESEARCH_SOURCE_MAX,
  researchSourceSchema,
  type ResearchSource,
} from "@/lib/writing-research-notes";
export function WritingZotero({
  existing,
  onImport,
  disabled,
}: {
  existing: ResearchSource[];
  onImport: (sources: ResearchSource[]) => void;
  disabled: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [viewport, setViewport] = useState<{ width: number; height: number; left: number; top: number }>();
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      // The installed fixed dialog uses viewport units. CSS root/body zoom
      // enlarges those units too, so limit the popup in visible CSS space.
      const zoom = [window.document.documentElement, window.document.body]
        .reduce((value, element) => value * (Number.parseFloat(getComputedStyle(element).zoom) || 1), 1);
      setViewport({ width: (window.innerWidth - 32) / zoom, height: (window.innerHeight - 32) / zoom, left: window.innerWidth / (2 * zoom), top: window.innerHeight / (2 * zoom) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(window.document.documentElement);
    observer.observe(window.document.body);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [open]);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState("");
  const [key, setKey] = useState("");
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/me/writing/zotero?status=1", { cache: "no-store" })
      .then(
        async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error();
          if (active) {
            setConnected(data.connected === true);
            setUserId(data.userId ?? "");
            setError("");
          }
        },
        () => {
          if (active) setError("Zotero could not be opened. Try again.");
        },
      )
      .catch(() => {
        if (active) setError("Zotero could not be opened. Try again.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [open]);
  async function action(kind: "connect" | "browse" | "disconnect", start = 0) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        kind === "browse"
          ? `/api/me/writing/zotero?q=${encodeURIComponent(search)}&start=${start}`
          : "/api/me/writing/zotero",
        {
          method:
            kind === "connect"
              ? "POST"
              : kind === "disconnect"
                ? "DELETE"
                : "GET",
          headers:
            kind === "connect"
              ? { "Content-Type": "application/json" }
              : undefined,
          body:
            kind === "connect"
              ? JSON.stringify({ userId, apiKey: key })
              : undefined,
          cache: "no-store",
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "Zotero could not be reached. Try again.",
        );
      setConnected(data.connected === true);
      if (kind === "connect") {
        setKey("");
        setNotice(
          "Connected. Search or browse your library to choose references.",
        );
      }
      if (kind === "browse") {
        const list = Array.isArray(data.sources)
          ? data.sources.flatMap((item: unknown) => {
              const result = researchSourceSchema.safeParse(item);
              return result.success ? [result.data] : [];
            })
          : [];
        setSources(list);
        setSelected([]);
        setNext(data.nextStart ?? null);
        if (!list.length)
          setNotice("No supported references found. Try another search.");
      }
      if (kind === "disconnect") {
        setSources([]);
        setKey("");
        setNotice(
          "Disconnected. Imported references are kept. Revoke the dedicated key in Zotero settings if you no longer need it.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Zotero could not be reached. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function importSelected() {
    const additions = sources.filter(
      (source) =>
        selected.includes(source.id) &&
        !existing.some((item) => item.id === source.id),
    );
    if (existing.length + additions.length > RESEARCH_SOURCE_MAX) {
      setError(
        "This project has room for fewer sources. Select fewer references.",
      );
      return;
    }
    onImport(additions);
    setSelected([]);
    setNotice(
      `${additions.length} references imported. Save notes and plans to keep them in your account. Your draft is unchanged.`,
    );
  }
  return (
    <>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setBusy(true);
          setNotice("");
          setOpen(true);
        }}
      >
        Import from Zotero
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!busy) {
            setOpen(nextOpen);
            if (!nextOpen) {
              setKey("");
              setSelected([]);
              setSources([]);
              setNext(null);
            }
          }
        }}
      >
        <DialogContent
          className="max-h-[90dvh] min-w-0 overflow-y-auto [&>*]:min-w-0"
          style={viewport ? { maxWidth: viewport.width, maxHeight: viewport.height, left: viewport.left, top: viewport.top } : undefined}
        >
          <DialogHeader className="min-w-0">
            <DialogTitle className="break-words">Zotero references</DialogTitle>
            <DialogDescription>
              Import selected books, journal articles, reports and web pages
              from your personal library. Imported copies are editable and do
              not sync.
            </DialogDescription>
          </DialogHeader>
          {!connected ? (
            <>
              <p className="text-sm text-muted-foreground">
                Create a dedicated key with personal library read access. Leave
                files, notes, write access and group access off. Your key is
                stored encrypted on Missa’s server.
              </p>
              <a
                className="text-sm underline"
                href="https://www.zotero.org/settings/keys/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                Create a Zotero key
              </a>
              <FieldGroup className="min-w-0">
                <Field className="min-w-0">
                  <FieldLabel htmlFor={`${id}-user`}>Zotero user ID</FieldLabel>
                  <Input
                    id={`${id}-user`}
                    inputMode="numeric"
                    value={userId}
                    disabled={busy}
                    onChange={(event) => setUserId(event.target.value)}
                    maxLength={15}
                  />
                </Field>
                <Field className="min-w-0">
                  <FieldLabel htmlFor={`${id}-key`}>
                    Dedicated API key
                  </FieldLabel>
                  <Input
                    id={`${id}-key`}
                    type="password"
                    autoComplete="off"
                    value={key}
                    disabled={busy}
                    onChange={(event) => setKey(event.target.value)}
                    maxLength={128}
                  />
                </Field>
              </FieldGroup>
              <Button
                disabled={busy || !key || !userId}
                onClick={() => void action("connect")}
              >
                {busy ? "Connecting…" : "Connect Zotero"}
              </Button>
            </>
          ) : (
            <>
              <Field className="min-w-0">
                <FieldLabel htmlFor={`${id}-search`}>
                  Search your Zotero library
                </FieldLabel>
                <Input
                  id={`${id}-search`}
                  value={search}
                  disabled={busy}
                  maxLength={200}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setNext(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void action("browse");
                    }
                  }}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="inline"
                  className="max-w-full whitespace-normal"
                  disabled={busy}
                  onClick={() => void action("browse")}
                >
                  {busy ? "Loading…" : "Browse references"}
                </Button>
                <Button
                  variant="ghost"
                  size="inline"
                  className="max-w-full whitespace-normal"
                  disabled={busy}
                  onClick={() => void action("disconnect")}
                >
                  Disconnect Zotero
                </Button>
              </div>
              {sources.map((source) => (
                <Field key={source.id} orientation="horizontal">
                  <Checkbox
                    id={`${id}-${source.id}`}
                    checked={selected.includes(source.id)}
                    disabled={
                      busy || existing.some((item) => item.id === source.id)
                    }
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked === true
                          ? [...current, source.id]
                          : current.filter((item) => item !== source.id),
                      )
                    }
                  />
                  <div className="min-w-0">
                    <FieldLabel htmlFor={`${id}-${source.id}`}>
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{source.title}</span>
                    </FieldLabel>
                    <p className="text-xs break-words text-muted-foreground">
                      {source.author}
                      {existing.some((item) => item.id === source.id)
                        ? " · Already imported"
                        : ""}
                    </p>
                  </div>
                </Field>
              ))}
              {next !== null ? (
                <Button
                  variant="outline"
                  size="inline"
                  className="max-w-full whitespace-normal"
                  disabled={busy}
                  onClick={() => void action("browse", next)}
                >
                  Next references
                </Button>
              ) : null}
              <Button
                size="inline"
                className="max-w-full whitespace-normal"
                disabled={busy || selected.length === 0 || disabled}
                onClick={importSelected}
              >
                Import selected ({selected.length})
              </Button>
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <p role="status" className="text-sm text-muted-foreground">
            {notice || (busy ? "Loading Zotero…" : "")}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
