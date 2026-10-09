"use client";
import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  serializeDocument,
  type WritingDocument,
} from "@/lib/writing-document";
import { inspectWritingExport, importWritingFile } from "@/lib/writing-export";
import { pickDriveFile } from "@/lib/writing-drive-picker";
export function WritingDrive({
  document,
  title,
  entryId,
  readOnly,
  onImport,
}: {
  document: WritingDocument;
  title: string;
  entryId: string;
  readOnly: boolean;
  onImport: (document: WritingDocument, title: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [configured, setConfigured] = useState(false),
    [checked, setChecked] = useState(false),
    [error, setError] = useState(""),
    [flatten, setFlatten] = useState(false),
    [copy, setCopy] = useState<{ url: string; name: string } | null>(null);
  const [operation, setOperation] = useState<{
    id: string;
    document: string;
    title: string;
    flattenCanvas: boolean;
  } | null>(null);
  useEffect(() => {
    const url = new URL(location.href);
    const result = url.searchParams.get("drive");
    if (result === "connected") toast.success("Google Drive connected.");
    else if (result === "failed" || result === "unavailable")
      toast.error(
        "Google Drive could not connect. Open Google Drive in Tools to try again.",
      );
    if (result) {
      url.searchParams.delete("drive");
      history.replaceState(history.state, "", url);
    }
  }, []);
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
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setOpen(next);
          if (next) void check();
        }
      }}
    >
      <SheetTrigger render={<Button variant="ghost" disabled={readOnly} />}>
        <Cloud aria-hidden="true" />
        Google Drive
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Google Drive</SheetTitle>
          <SheetDescription>
            Import a chosen file as a new piece, or save a DOCX copy to your
            Drive.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-6 pb-6">
          {!checked ? (
            <p role="status">Checking connection…</p>
          ) : !configured ? (
            <p className="text-sm text-muted-foreground">
              Google Drive is not available here yet.
            </p>
          ) : !connected ? (
            <>
              <p className="text-sm text-muted-foreground">
                Missa requests access to files you choose and copies it creates.
                Your draft stays in Missa.
              </p>
              <Button
                render={
                  <a
                    href={`/api/me/writing/drive/start?entry=${encodeURIComponent(entryId)}`}
                  />
                }
              >
                Connect Google Drive
              </Button>
            </>
          ) : (
            <>
              <Button disabled={busy || readOnly} onClick={() => void choose()}>
                Choose a Drive file
              </Button>
              <section className="space-y-3" aria-label="Drive copy preview">
                <h3 className="font-medium">Save a DOCX copy</h3>
                <p className="text-sm text-muted-foreground">
                  The Article preset formats this copy. Check it in Google Drive
                  before sharing.
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
                    busy || readOnly || (!operation && report.errors.length > 0)
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
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                Disconnect Drive
              </Button>
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
      </SheetContent>
    </Sheet>
  );
}
