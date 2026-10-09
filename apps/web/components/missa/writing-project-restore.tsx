"use client";
import { useId, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  parseProjectBackup,
  prepareProjectRestore,
  PROJECT_BACKUP_FILE_MAX,
  type PreparedProjectRestore,
} from "@/lib/writing-project-backup";
import { revisionToolsKey } from "@/lib/writing-revision-tools";

export function WritingProjectRestore({
  deviceKey,
  onRestored,
}: {
  deviceKey: string;
  onRestored: (
    projectId: string,
    entryId: string | null,
  ) => void | Promise<void>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [backup, setBackup] = useState<PreparedProjectRestore | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [restored, setRestored] = useState(false);
  const [deviceFailed, setDeviceFailed] = useState(false);
  async function read(file: File) {
    setBusy(true);
    setError("");
    setStatus("");
    setBackup(null);
    setRestored(false);
    setDeviceFailed(false);
    try {
      if (file.size > PROJECT_BACKUP_FILE_MAX)
        throw new Error("Choose a project backup smaller than 32 MB.");
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      setBackup(prepareProjectRestore(parseProjectBackup(raw)));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "This project backup could not be read.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!backup || busy || restored) return;
    setBusy(true);
    setError("");
    setStatus("Restoring a separate project…");
    try {
      const response = await fetch("/api/me/writing/projects/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...backup, deviceRevisions: {} }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            "The project could not be restored. Keep the file and retry.",
        );
      let failed = false;
      for (const [entryId, raw] of Object.entries(backup.deviceRevisions)) {
        if (raw === null) continue;
        try {
          localStorage.setItem(revisionToolsKey(deviceKey, entryId), raw);
        } catch {
          failed = true;
        }
      }
      setDeviceFailed(failed);
      setRestored(true);
      setStatus("Project restored to your account.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The project could not be restored. Keep the file and retry.",
      );
      setStatus("");
    } finally {
      setBusy(false);
    }
  }
  function recoveryDownload() {
    if (!backup) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "missa-restored-project-recovery.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      <SheetTrigger render={<Button variant="outline" />}>
        <Upload aria-hidden="true" /> Restore project
      </SheetTrigger>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-md"
        aria-busy={busy || undefined}
      >
        <SheetHeader>
          <SheetTitle>Restore a project backup</SheetTitle>
          <SheetDescription>
            Restore a Missa whole-project JSON backup into a separate project.
            Existing projects stay saved.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-6 pb-6">
          <Field>
            <FieldLabel htmlFor={`${id}-file`}>
              Choose a whole-project backup
            </FieldLabel>
            <Input
              id={`${id}-file`}
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void read(file);
              }}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Files up to 32 MB can be read. The restored project must fit the 4
            MB account upload limit. Documents, cards, sources and checkpoints
            are kept; shared reader links are not recreated.
          </p>
          {backup ? (
            <section
              className="min-w-0 space-y-3"
              aria-label="Project restore preview"
            >
              <h3 className="font-medium break-words">
                {backup.project.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {backup.pieces.length} pieces ·{" "}
                {backup.studio.research.sources.length} sources ·{" "}
                {backup.studio.revisions.checkpoints.length} checkpoints
              </p>
              <ol className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {backup.pieces.map((piece) => (
                  <li className="break-words" key={piece.id}>
                    {piece.title || "Untitled piece"}
                  </li>
                ))}
              </ol>
              {!restored ? (
                <Button
                  disabled={busy}
                  aria-busy={busy || undefined}
                  className="h-auto min-h-11 max-w-full whitespace-normal"
                  onClick={() => void restore()}
                >
                  {busy ? "Restoring…" : "Restore as a separate project"}
                </Button>
              ) : (
                <Button
                  className="h-auto min-h-11 max-w-full whitespace-normal"
                  onClick={() => {
                    void onRestored(
                      backup.project.id,
                      backup.pieces[0]?.id ?? null,
                    );
                    setOpen(false);
                  }}
                >
                  Open restored project
                </Button>
              )}
            </section>
          ) : null}
          {deviceFailed ? (
            <Alert>
              <AlertDescription>
                Project data is saved to your account. This browser could not
                keep all private revision notes on this device. Keep the
                original file or download a recovery copy.
                <Button
                  variant="outline"
                  className="mt-3 h-auto min-h-11 max-w-full whitespace-normal"
                  onClick={recoveryDownload}
                >
                  Download recovery copy
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            {busy && !backup ? "Reading backup…" : status}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
