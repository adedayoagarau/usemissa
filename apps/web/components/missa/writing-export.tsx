"use client";

import { useId, useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { WritingDocument } from "@/lib/writing-document";
import {
  EXPORT_PRESETS,
  exportDocx,
  exportEpub,
  exportFilename,
  exportPlainText,
  importWritingFile,
  inspectWritingExport,
  type ExportPreset,
} from "@/lib/writing-export";

/** Download a local copy; a browser's save/cancel choice cannot be observed here. */
function download(bytes: Uint8Array | string, mime: string, filename: string) {
  const blob = new Blob([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function WritingExport({ document, title, onImport, readOnly, onPrint }: {
  document: WritingDocument;
  title: string;
  onImport: (document: WritingDocument, title: string) => void;
  readOnly: boolean;
  onPrint: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [exportTitle, setExportTitle] = useState(title);
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState("en");
  const [preset, setPreset] = useState<ExportPreset>("manuscript");
  const [flattenCanvas, setFlattenCanvas] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [previewFormat, setPreviewFormat] = useState<"docx" | "epub" | "txt">("docx");
  const report = useMemo(() => open ? inspectWritingExport(document, previewFormat, flattenCanvas) : { preview: "", warnings: [], errors: [] }, [open, document, previewFormat, flattenCanvas]);
  const hasCanvas = document.pages.some((page) => page.kind === "canvas");
  const canExport = !busy && (!hasCanvas || flattenCanvas);

  async function exportFile(format: "docx" | "epub" | "txt") {
    setBusy(format);
    setError("");
    setStatus("");
    try {
      const inspection = inspectWritingExport(document, format, flattenCanvas);
      if (inspection.errors.length) throw new Error(inspection.errors.join(" "));
      const metadata = { title: exportTitle, author, language, preset, flattenCanvas };
      const bytes = format === "docx" ? await exportDocx(document, metadata)
        : format === "epub" ? await exportEpub(document, metadata)
          : exportPlainText(document, flattenCanvas);
      const mime = format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : format === "epub" ? "application/epub+zip" : "text/plain;charset=utf-8";
      download(bytes, mime, `${exportFilename(exportTitle)}.${format}`);
      setStatus(`${format.toUpperCase()} download started.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't export this piece. Try again.");
    } finally { setBusy(null); }
  }

  async function importFile(file: File) {
    if (readOnly || busy) return;
    setBusy("import");
    setError("");
    setStatus("");
    try {
      const imported = await importWritingFile(file, document.typeface);
      onImport(imported, file.name.replace(/\.(txt|docx)$/i, "") || "Imported piece");
      setOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't import that file. Try a .txt or .docx file.");
    } finally { setBusy(null); }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) { setExportTitle(title); setFlattenCanvas(false); setError(""); setStatus(""); }
    }}>
      <SheetTrigger render={<Button variant="ghost" size="sm" />}>
        <Download aria-hidden="true" /> Export
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md print:hidden" aria-busy={Boolean(busy)}>
        <SheetHeader>
          <SheetTitle>Import and export</SheetTitle>
          <SheetDescription>Prepare a copy in your browser, or import a new piece.</SheetDescription>
        </SheetHeader>
        {/* Comfortable density: 12px within groups, 24px between groups; 24px inset. */}
        <div className="space-y-6 px-6 pb-6">
          <div className="space-y-3">
            <Field>
              <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
              <Input id={`${id}-title`} value={exportTitle} maxLength={300} disabled={Boolean(busy)} onChange={(event) => setExportTitle(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-author`}>Author (optional)</FieldLabel>
              <Input id={`${id}-author`} value={author} maxLength={200} disabled={Boolean(busy)} onChange={(event) => setAuthor(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-language`}>Language code</FieldLabel>
              <Input id={`${id}-language`} value={language} maxLength={50} placeholder="en, fr or en-GB" disabled={Boolean(busy)} onChange={(event) => setLanguage(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-preset`}>Export preset</FieldLabel>
              <NativeSelect id={`${id}-preset`} value={preset} disabled={Boolean(busy)} onChange={(event) => setPreset(event.target.value as ExportPreset)}>
                {Object.entries(EXPORT_PRESETS).map(([value, item]) => <NativeSelectOption key={value} value={value}>{item.label}</NativeSelectOption>)}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">{EXPORT_PRESETS[preset].description}</p>
            </Field>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">DOCX applies the preset to a copy and keeps text, headings, lists, emphasis, tables and local PNG/JPEG images up to 128 KB. Fonts are not embedded. EPUB reflows for the reader; its font and line spacing may change. Print / PDF uses your current pages.</p>
            {hasCanvas && <Alert>
              <AlertDescription>
                <p>Canvas box positions, widths and rotations are lost in DOCX, EPUB and text. Print / PDF keeps the page layout.</p>
                <div className="mt-3 flex items-start gap-3">
                  <Checkbox id={`${id}-canvas`} checked={flattenCanvas} disabled={Boolean(busy)} onCheckedChange={(checked) => setFlattenCanvas(checked === true)} />
                  <Label htmlFor={`${id}-canvas`}>Turn canvas boxes into text, top to bottom and left to right</Label>
                </div>
              </AlertDescription>
            </Alert>}
            <Field>
              <FieldLabel htmlFor={`${id}-preview`}>Preview export</FieldLabel>
              <NativeSelect id={`${id}-preview`} value={previewFormat} disabled={Boolean(busy)} onChange={(event) => setPreviewFormat(event.target.value as "docx" | "epub" | "txt")}>
                <NativeSelectOption value="docx">DOCX</NativeSelectOption><NativeSelectOption value="epub">EPUB</NativeSelectOption><NativeSelectOption value="txt">Plain text</NativeSelectOption>
              </NativeSelect>
            </Field>
            <p className="text-xs text-muted-foreground">Reading-order text preview. Open the downloaded file to check its final layout.</p>
            <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border p-3 text-sm" aria-label="Export text preview">{report.preview.slice(0, 12000) || "This piece is empty."}{report.preview.length > 12000 ? "\n… Preview limited to the first 12,000 characters." : ""}</div>
            <ul className="space-y-2 text-xs text-muted-foreground">{report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            {report.errors.length ? <Alert variant="destructive"><AlertDescription>{report.errors.join(" ")}</AlertDescription></Alert> : null}
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canExport} onClick={() => void exportFile("docx")}>{busy === "docx" ? "Preparing DOCX…" : "Download DOCX"}</Button>
              <Button variant="outline" disabled={!canExport} onClick={() => void exportFile("epub")}>{busy === "epub" ? "Preparing EPUB…" : "Download EPUB"}</Button>
              <Button variant="outline" disabled={!canExport} onClick={() => void exportFile("txt")}>Download text</Button>
              <Button variant="outline" disabled={Boolean(busy)} onClick={() => { setOpen(false); window.requestAnimationFrame(onPrint); }}>Print / PDF</Button>
            </div>
          </div>
          <div className="space-y-3 border-t border-border pt-6">
            <h3 className="font-medium">Import as a new piece</h3>
            <p className="text-sm text-muted-foreground">Choose UTF-8 text or DOCX, up to 10 MB. DOCX keeps headings, lists, tables and basic emphasis. Images, footnotes, comments, custom styles and page layouts are not kept. Your open piece stays saved.</p>
            <Field>
              <FieldLabel htmlFor={`${id}-import`}><Upload aria-hidden="true" className="size-4" /> Choose a file</FieldLabel>
              <Input id={`${id}-import`} type="file" accept=".txt,.docx" disabled={readOnly || Boolean(busy)} onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importFile(file);
              }} />
            </Field>
            {readOnly && <p className="text-sm text-muted-foreground">Import is unavailable while this piece is read-only.</p>}
          </div>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{busy === "import" ? "Reading file…" : status}</p>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
