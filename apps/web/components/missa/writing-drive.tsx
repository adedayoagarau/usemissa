"use client";
import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  serializeDocument,
  type WritingDocument,
} from "@/lib/writing-document";
import { inspectWritingExport, importWritingFile } from "@/lib/writing-export";
import { pickDriveFile } from "@/lib/writing-drive-picker";
export function WritingDrive({
  document,
  title,
  prepareConnection,
  connectionReturn,
  readOnly,
  onImport,
}: {
  document: WritingDocument;
  title: string;
  prepareConnection: () => string | undefined;
  connectionReturn?: { result: string | null; action: string | null };
  readOnly: boolean;
  onImport: (document: WritingDocument, title: string) => void;
}) {
  const [open, setOpen] = useState(
      () => (connectionReturn?.result ?? new URLSearchParams(location.search).get("drive")) === "connected",
    ),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [configured, setConfigured] = useState(false),
    [checked, setChecked] = useState(false),
    [error, setError] = useState(""),
    [flatten, setFlatten] = useState(false),
    [copy, setCopy] = useState<{ url: string; name: string } | null>(null);
  const [savePreview, setSavePreview] = useState(
    () => (connectionReturn?.action ?? new URLSearchParams(location.search).get("driveAction")) === "save",
  );
  const [operation, setOperation] = useState<{
    id: string;
    document: string;
    title: string;
    flattenCanvas: boolean;
  } | null>(null);
  useEffect(() => {
    const url = new URL(location.href);
    const result = connectionReturn?.result ?? url.searchParams.get("drive");
    if (result === "connected") {
      toast.success("Google Drive connected.");
      void check();
    } else if (result === "failed" || result === "unavailable")
      toast.error(
        "Google Drive could not connect. Open Google Drive in Tools to try again.",
      );
    if (result) {
      url.searchParams.delete("drive");
      url.searchParams.delete("driveAction");
      url.searchParams.delete("driveNew");
      history.replaceState(history.state, "", url);
    }
  }, [connectionReturn]);
  async function check() {
    setChecked(false);
    setError("");
    try {
      const response = await fetch("/api/me/writing/drive", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Sign in to connect Google Drive.");
      setConnected(body.connected);
      setConfigured(body.configured);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The connection could not be checked.",
      );
    } finally {
      setChecked(true);
    }
  }
  function connect(action: "open" | "save") {
    try {
      const entry = prepareConnection();
      const query = new URLSearchParams({ action });
      if (entry) query.set("entry", entry);
      location.assign(`/api/me/writing/drive/start?${query}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Save your draft before connecting.",
      );
    }
  }
  async function choose() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/me/writing/drive/token", {
        method: "POST",
      });
      const config = await response.json();
      if (!response.ok)
        throw new Error(config.error || "Reconnect Google Drive.");
      setOpen(false);
      const selected = await pickDriveFile(config);
      if (!selected) return;
      const result = await fetch("/api/me/writing/drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: selected.id }),
      });
      if (!result.ok) {
        const failure = await result.json();
        throw new Error(failure.error || "The file could not be imported.");
      }
      const name = decodeURIComponent(
        result.headers.get("X-Missa-File-Name") ||
          encodeURIComponent(selected.name),
      );
      const mime = result.headers.get("Content-Type") || "";
      const file = new File(
        [await result.arrayBuffer()],
        mime.startsWith("text/plain") ? `${name}.txt` : `${name}.docx`,
        { type: mime },
      );
      const imported = await importWritingFile(file, document.typeface);
      onImport(imported, name.replace(/\.(docx|txt)$/i, ""));
      toast.info(
        "Imported as a new piece. Check formatting; images and unsupported document styles are omitted.",
      );
    } catch (failure) {
      setOpen(true);
      setError(
        failure instanceof Error
          ? failure.message
          : "The file could not be imported.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function exportCopy() {
    setBusy(true);
    setError("");
    setCopy(null);
    const prepared = operation ?? {
      id: crypto.randomUUID(),
      document: serializeDocument(document),
      title,
      flattenCanvas: flatten,
    };
    setOperation(prepared);
    try {
      const response = await fetch("/api/me/writing/drive/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prepared, operationId: prepared.id }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "The copy could not be confirmed.");
      setCopy(body.file);
      setOperation(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The copy could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    try {
      const response = await fetch("/api/me/writing/drive", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("The connection could not be removed.");
      setConnected(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The connection could not be removed.",
      );
    } finally {
      setBusy(false);
    }
  }
  const report = inspectWritingExport(document, "docx", flatten);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setOpen(next);
          if (next) void check();
        }
      }}
    >
      <PopoverTrigger render={<Button variant="ghost" disabled={readOnly} />}>
        <Cloud aria-hidden="true" />
        Google Drive
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="max-h-(--available-height) overflow-y-auto"
      >
        <PopoverHeader>
          <PopoverTitle>Google Drive</PopoverTitle>
          <PopoverDescription>Import a file or save a copy.</PopoverDescription>
        </PopoverHeader>
        <div className="space-y-3">
          {!checked ? (
            <p role="status">Checking connection…</p>
          ) : !configured ? (
            <p className="text-sm text-muted-foreground">
              Google Drive is not available here yet.
            </p>
          ) : (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled={busy || readOnly}
                onClick={() => (connected ? void choose() : connect("open"))}
              >
                Open from Drive
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                disabled={busy || readOnly}
                onClick={() =>
                  connected ? setSavePreview(true) : connect("save")
                }
              >
                Save to Drive
              </Button>
              {!connected ? (
                <p className="text-xs text-muted-foreground">
                  Connect your Google account when you choose an action.
                </p>
              ) : null}
              {connected && savePreview ? (
                <section className="space-y-3" aria-label="Drive copy preview">
                  <h3 className="font-medium">Save a DOCX copy</h3>
                  <p className="text-sm text-muted-foreground">
                    The Article preset formats this copy. Check it in Google
                    Drive before sharing.
                  </p>
                  {document.pages.some((page) => page.kind === "canvas") ? (
                    <Field orientation="horizontal">
                      <Checkbox
                        id="drive-flatten"
                        checked={flatten}
                        disabled={busy || Boolean(operation)}
                        onCheckedChange={(checked) =>
                          setFlatten(checked === true)
                        }
                      />
                      <FieldLabel htmlFor="drive-flatten">
                        Turn canvas boxes into reading-order text
                      </FieldLabel>
                    </Field>
                  ) : null}
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {report.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                  {report.errors.map((message) => (
                    <p className="text-sm text-destructive" key={message}>
                      {message}
                    </p>
                  ))}
                  <Button
                    disabled={
                      busy ||
                      readOnly ||
                      (!operation && report.errors.length > 0)
                    }
                    onClick={() => void exportCopy()}
                  >
                    {busy
                      ? "Working…"
                      : operation
                        ? "Retry the same copy"
                        : "Save a copy to Drive"}
                  </Button>
                  {operation && !busy ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setOperation(null);
                        setError("");
                      }}
                    >
                      Prepare a new copy
                    </Button>
                  ) : null}
                </section>
              ) : null}
              {connected ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void disconnect()}
                >
                  Disconnect Drive
                </Button>
              ) : null}
            </>
          )}
          {copy ? (
            <p role="status" className="text-sm">
              Copy saved.{" "}
              <a
                className="underline underline-offset-4"
                href={copy.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open {copy.name}
              </a>
            </p>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
