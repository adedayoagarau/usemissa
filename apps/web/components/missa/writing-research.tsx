"use client";
import { WritingZotero } from "./writing-zotero";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConfirm } from "@/components/missa/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  createResearchAnchor,
  locateResearchAnchor,
  researchRecordId,
  researchSchema,
  researchSourceSchema,
  safeResearchUrl,
  RESEARCH_IMPORT_BYTES_MAX,
  RESEARCH_SNIPPET_MAX,
  RESEARCH_SOURCE_MAX,
  RESEARCH_NOTE_MAX,
  researchPieceTargets,
  researchPieceBacklinks,
  formatResearchCitation,
  RESEARCH_CITATION_STYLES,
  type ResearchPiece,
  type ResearchCitationStyle,
  type ResearchState,
  type ResearchSource,
  type ResearchNote,
} from "@/lib/writing-research-notes";

export type WritingResearchProps = {
  value: ResearchState;
  onChange: (value: ResearchState) => void;
  pieceId: string;
  selection: string;
  pieceText: string;
  onInsertCitation: (text: string) => boolean;
  onInsertFootnote?: (text: string) => boolean;
  readOnly: boolean;
  pieces?: ResearchPiece[];
  onInsertPieceLink?: (label: string, href: string) => boolean;
  onOpenPiece?: (id: string) => void;
};

/** Research remains separate from the draft until the writer inserts their text. */
export function WritingResearch({
  value,
  onChange,
  pieceId,
  selection,
  pieceText,
  onInsertCitation,
  onInsertFootnote,
  readOnly,
  pieces = [],
  onOpenPiece,
  onInsertPieceLink,
}: WritingResearchProps) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [pieceSearch, setPieceSearch] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [citationStyle, setCitationStyle] =
    useState<ResearchCitationStyle>("apa");
  const [formatting, setFormatting] = useState(false);
  const targets = researchPieceTargets(pieces).filter((target) =>
    target.label
      .toLocaleLowerCase()
      .includes(pieceSearch.trim().toLocaleLowerCase()),
  );
  const backlinks = researchPieceBacklinks(pieces, pieceId);
  async function formatSource() {
    if (!sourceDraft || readOnly || formatting) return;
    setFormatting(true);
    setError("");
    try {
      const result = await formatResearchCitation(sourceDraft, citationStyle);
      setSourceDraft((current) =>
        current?.id === sourceDraft.id
          ? {
              ...current,
              citation: result.citation,
              footnote: result.bibliography,
            }
          : current,
      );
      setNotice(
        result.warning ||
          "Citation and reference formatted. Check the preview before saving.",
      );
    } catch {
      setError(
        "The citation could not be formatted. Your source details and custom text are kept.",
      );
    } finally {
      setFormatting(false);
    }
  }
  const [sourceDraft, setSourceDraft] = useState<ResearchSource | null>(null);
  const [noteDraft, setNoteDraft] = useState<ResearchNote | null>(null);
  const { confirm, dialog: confirmation } = useConfirm();
  function removeRecord(record: { kind: "source" | "note"; id: string }) {
    void confirm({
      title: `Remove ${record.kind}?`,
      description:
        record.kind === "source"
          ? "Linked notes are kept without a source link. Text in the draft stays unchanged."
          : "The quoted draft text stays unchanged.",
      confirmLabel: "Remove",
      destructive: true,
    }).then((accepted) => {
      if (!accepted) return;
      const next =
        record.kind === "source"
          ? {
              ...value,
              sources: value.sources.filter(
                (source) => source.id !== record.id,
              ),
              notes: value.notes.map((note) =>
                note.sourceId === record.id
                  ? { ...note, sourceId: null }
                  : note,
              ),
            }
          : {
              ...value,
              notes: value.notes.filter((note) => note.id !== record.id),
            };
      if (change(next)) setNotice("Removed from research.");
    });
  }
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);
  const query = search.trim().toLocaleLowerCase();
  const sources = value.sources.filter((source) =>
    Object.values(source).some(
      (text) =>
        typeof text === "string" && text.toLocaleLowerCase().includes(query),
    ),
  );
  const pieceNotes = value.notes.filter((note) => note.pieceId === pieceId);
  const notes = pieceNotes.filter((note) =>
    [
      note.body,
      note.quote,
      value.sources.find((source) => source.id === note.sourceId)?.title ?? "",
    ].some((text) => text.toLocaleLowerCase().includes(query)),
  );
  const selectedAnchor = createResearchAnchor(pieceId, selection, pieceText);

  function change(next: ResearchState): boolean {
    if (readOnly) return false;
    const checked = researchSchema.safeParse(next);
    if (!checked.success) {
      setError(
        checked.error.issues[0]?.message ?? "Check your research fields.",
      );
      return false;
    }
    onChange(checked.data);
    setError("");
    return true;
  }

  function newSource() {
    setError("");
    setSourceDraft(
      researchSourceSchema.parse({
        id: researchRecordId(),
        title: "Untitled source",
      }),
    );
  }

  function saveSource() {
    if (!sourceDraft) return;
    const exists = value.sources.some((source) => source.id === sourceDraft.id);
    if (
      change({
        ...value,
        sources: exists
          ? value.sources.map((source) =>
              source.id === sourceDraft.id ? sourceDraft : source,
            )
          : [...value.sources, sourceDraft],
      })
    ) {
      setSourceDraft(null);
      setNotice("Source saved in research.");
    }
  }

  function newNote() {
    if (!selectedAnchor) return;
    setError("");
    setNoteDraft({
      id: researchRecordId(),
      ...selectedAnchor,
      body: "",
      sourceId: null,
    });
  }

  function saveNote() {
    if (!noteDraft) return;
    const exists = value.notes.some((note) => note.id === noteDraft.id);
    if (
      change({
        ...value,
        notes: exists
          ? value.notes.map((note) =>
              note.id === noteDraft.id ? noteDraft : note,
            )
          : [...value.notes, noteDraft],
      })
    ) {
      setNoteDraft(null);
      setNotice("Note saved in research.");
    }
  }

  async function importSnippet(file: File, targetId: string) {
    if (readOnly) return;
    if (
      !file.name.toLowerCase().endsWith(".txt") ||
      file.size > RESEARCH_IMPORT_BYTES_MAX
    ) {
      setError("Choose a .txt file smaller than 80 KB.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const text = await file.text();
      if (text.length > RESEARCH_SNIPPET_MAX || text.includes("\0")) {
        setError("Choose plain text with up to 20,000 characters.");
        return;
      }
      setSourceDraft((current) =>
        current?.id === targetId ? { ...current, excerpt: text } : current,
      );
      setNotice(
        "Text read from this device. Save the source to keep the excerpt.",
      );
    } catch {
      setError("Couldn’t read that file. Try a plain-text .txt file.");
    } finally {
      setImporting(false);
    }
  }

  function insert(text: string) {
    if (!readOnly && text.trim()) {
      setNotice(
        onInsertCitation(text)
          ? "Text inserted into the draft. You can undo it in the editor."
          : "Place the caret in the draft before inserting text.",
      );
    }
  }

  function sourceField(
    key: keyof Omit<ResearchSource, "id">,
    label: string,
    multiline = false,
    maxLength = 500,
  ) {
    if (!sourceDraft) return null;
    const inputId = `${id}-source-${key}`;
    const props = {
      id: inputId,
      value: sourceDraft[key],
      maxLength,
      readOnly,
      disabled: importing || formatting,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setSourceDraft({ ...sourceDraft, [key]: event.target.value }),
    };
    return (
      <Field key={key}>
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        {multiline ? <Textarea {...props} rows={3} /> : <Input {...props} />}
      </Field>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Research">
      <div>
        <h2 className="text-base font-medium">Research</h2>
        <p className="text-sm text-muted-foreground">
          Sources and notes stay outside your exported draft until you insert
          text.
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor={`${id}-search`}>Search research</FieldLabel>
        <Input
          id={`${id}-search`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles, authors, excerpts or notes"
          type="search"
        />
      </Field>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground" role="status">
        {notice}
      </p>
      <div className="flex flex-wrap gap-2">
        <WritingZotero
          existing={value.sources}
          disabled={readOnly || value.sources.length >= RESEARCH_SOURCE_MAX}
          onImport={(sources) =>
            onChange({ ...value, sources: [...value.sources, ...sources] })
          }
        />
        <Button
          variant="outline"
          onClick={newSource}
          disabled={readOnly || value.sources.length >= RESEARCH_SOURCE_MAX}
        >
          Add source
        </Button>
        <Button
          variant="outline"
          onClick={newNote}
          disabled={
            readOnly ||
            !selectedAnchor ||
            value.notes.length >= RESEARCH_NOTE_MAX
          }
        >
          Add note
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {selection
          ? selectedAnchor
            ? "Add a note to the selected text."
            : "Select a longer, unique passage to anchor a note."
          : "Select text in the draft to anchor a note."}
      </p>
      {readOnly && (
        <p className="text-sm text-muted-foreground">
          Research is read-only for this piece.
        </p>
      )}
      <section
        aria-label="Piece links"
        className="space-y-3 border-t border-border pt-3"
      >
        <h3 className="text-sm font-medium">Link to a piece or heading</h3>
        <Field>
          <FieldLabel htmlFor={`${id}-piece-search`}>
            Find a piece or heading
          </FieldLabel>
          <Input
            id={`${id}-piece-search`}
            value={pieceSearch}
            onChange={(event) => setPieceSearch(event.target.value)}
            placeholder="Search this project"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-piece-link`}>Link destination</FieldLabel>
          <NativeSelect
            id={`${id}-piece-link`}
            value={linkTarget}
            onChange={(event) => setLinkTarget(event.target.value)}
          >
            <NativeSelectOption value="">
              Choose a piece or heading
            </NativeSelectOption>
            {targets.map((target) => (
              <NativeSelectOption key={target.href} value={target.href}>
                {target.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Button
          variant="outline"
          disabled={
            readOnly ||
            !onInsertPieceLink ||
            !targets.some((target) => target.href === linkTarget)
          }
          onClick={() => {
            const target = targets.find((item) => item.href === linkTarget);
            if (!target || !onInsertPieceLink?.(target.label, target.href))
              setError("Choose a place in the draft before inserting a link.");
            else setNotice("Piece link added to the draft.");
          }}
        >
          Insert piece link
        </Button>
        <p className="text-sm text-muted-foreground">
          Heading destinations appear after you copy a section link in that
          heading. Links remain within your account.
        </p>
        <h3 className="text-sm font-medium">
          Linked from ({backlinks.length})
        </h3>
        {backlinks.length ? (
          <ul className="space-y-1">
            {backlinks.map((link) => (
              <li key={link.pieceId}>
                <Button
                  variant="ghost"
                  className="max-w-full text-left whitespace-normal"
                  disabled={!onOpenPiece}
                  onClick={() => onOpenPiece?.(link.pieceId)}
                >
                  {link.title}
                  {link.sections.length
                    ? ` · ${link.sections.length} heading ${link.sections.length === 1 ? "link" : "links"}`
                    : ""}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No other pieces in this project link here yet.
          </p>
        )}
      </section>
      <h3 className="text-sm font-medium">Sources ({value.sources.length})</h3>
      {!sources.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {query ? "No sources match" : "No sources yet"}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? "Try another search."
                : "Add a source and keep the excerpt, page and your citation together."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {sources.map((source) => (
            <li key={source.id} className="min-w-0 border-b border-border pb-4">
              <h4 className="text-sm font-medium break-words">
                {source.title}
              </h4>
              <p className="text-sm break-words text-muted-foreground">
                {[
                  source.author,
                  source.publicationDate,
                  source.page && `Page ${source.page}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {source.url && safeResearchUrl(source.url) && (
                <a
                  className="text-sm break-all underline underline-offset-4 focus-visible:outline focus-visible:outline-ring"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open source
                </a>
              )}
              {value.notes.some((note) => note.sourceId === source.id) ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Referenced passages
                  </p>
                  <ul className="space-y-1">
                    {value.notes
                      .filter((note) => note.sourceId === source.id)
                      .map((note) => (
                        <li key={note.id}>
                          <Button
                            variant="ghost"
                            className="h-auto max-w-full text-left whitespace-normal"
                            disabled={!onOpenPiece}
                            onClick={() => onOpenPiece?.(note.pieceId)}
                          >
                            {pieces.find((piece) => piece.id === note.pieceId)
                              ?.title || "Untitled piece"}
                            : {note.quote.slice(0, 120)}
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setError("");
                    setSourceDraft({ ...source });
                  }}
                >
                  {readOnly ? "View source" : "Edit source"}
                </Button>
                <Button
                  variant="outline"
                  disabled={readOnly || !source.citation.trim()}
                  onClick={() => insert(source.citation)}
                >
                  Insert citation
                </Button>
                <Button
                  variant="outline"
                  disabled={readOnly || !source.footnote.trim()}
                  onClick={() => {
                    if (!onInsertFootnote?.(source.footnote))
                      setError(
                        "Choose a place in the draft before inserting a footnote.",
                      );
                    else setNotice("Footnote added to the draft.");
                  }}
                >
                  Insert footnote
                </Button>
                <Button
                  variant="ghost"
                  disabled={readOnly}
                  onClick={() =>
                    removeRecord({ kind: "source", id: source.id })
                  }
                  aria-label={`Remove source ${source.title}`}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <h3 className="text-sm font-medium">
        Notes for this piece ({pieceNotes.length})
      </h3>
      {!notes.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{query ? "No notes match" : "No notes yet"}</EmptyTitle>
            <EmptyDescription>
              {query
                ? "Try another search."
                : "Select a passage in the draft, then add your note."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {notes.map((note) => {
            const anchor = locateResearchAnchor(note, pieceId, pieceText);
            const linked = value.sources.find(
              (source) => source.id === note.sourceId,
            );
            return (
              <li key={note.id} className="min-w-0 border-b border-border pb-4">
                <p className="text-sm font-medium">
                  {anchor.status === "anchored"
                    ? "Anchored to draft"
                    : "Orphaned note"}
                </p>
                {anchor.status === "orphaned" && (
                  <p className="text-sm text-muted-foreground">
                    {anchor.reason === "missing"
                      ? "The quoted text is no longer in this piece."
                      : "The passage cannot be identified uniquely. Select the intended text and relink this note."}
                  </p>
                )}
                <blockquote className="my-2 border-l border-border pl-3 text-sm break-words whitespace-pre-wrap">
                  {note.quote}
                </blockquote>
                <p className="text-sm break-words whitespace-pre-wrap">
                  {note.body}
                </p>
                {linked && (
                  <p className="mt-2 text-sm break-words text-muted-foreground">
                    Source: {linked.title}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setError("");
                      setNoteDraft({ ...note });
                    }}
                  >
                    {readOnly ? "View note" : "Edit note"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={readOnly}
                    onClick={() => removeRecord({ kind: "note", id: note.id })}
                  >
                    Remove note
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={sourceDraft !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSourceDraft(null);
            setError("");
          }
        }}
      >
        <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{readOnly ? "Source" : "Edit source"}</DialogTitle>
            <DialogDescription>
              Keep the details you have checked. Links open the original page;
              Missa does not retrieve it.
            </DialogDescription>
          </DialogHeader>
          {sourceDraft && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveSource();
              }}
            >
              {sourceField("title", "Title")}
              <Field>
                <FieldLabel htmlFor={`${id}-source-type`}>
                  Source type
                </FieldLabel>
                <NativeSelect
                  id={`${id}-source-type`}
                  value={sourceDraft.sourceType}
                  disabled={readOnly || formatting}
                  onChange={(event) =>
                    setSourceDraft({
                      ...sourceDraft,
                      sourceType: event.target
                        .value as ResearchSource["sourceType"],
                    })
                  }
                >
                  <NativeSelectOption value="webpage">
                    Web page
                  </NativeSelectOption>
                  <NativeSelectOption value="article-journal">
                    Journal article
                  </NativeSelectOption>
                  <NativeSelectOption value="book">Book</NativeSelectOption>
                  <NativeSelectOption value="report">Report</NativeSelectOption>
                </NativeSelect>
              </Field>

              {sourceField("url", "Source link", false, 2_000)}
              {sourceField("author", "Author or organization")}
              {sourceField("authorFamily", "Author family name (optional)")}
              {sourceField("authorGiven", "Author given name (optional)")}
              {sourceField(
                "publicationDate",
                "Publication date (YYYY-MM-DD)",
                false,
                100,
              )}
              {sourceField("publicationName", "Journal or publication")}
              {sourceField("publisher", "Publisher")}
              {sourceField("volume", "Volume", false, 100)}
              {sourceField("issue", "Issue", false, 100)}
              {sourceField("page", "Page or locator", false, 100)}
              {sourceField("excerpt", "Excerpt", true, RESEARCH_SNIPPET_MAX)}
              <Field>
                <FieldLabel htmlFor={`${id}-import`}>
                  Import a text excerpt
                </FieldLabel>
                <Input
                  id={`${id}-import`}
                  type="file"
                  accept=".txt,text/plain"
                  disabled={readOnly || importing}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importSnippet(file, sourceDraft.id);
                    event.target.value = "";
                  }}
                />
                <FieldDescription>
                  A local .txt file, up to 80 KB and 20,000 characters. Its text
                  replaces the excerpt. The file itself is not attached.
                </FieldDescription>
              </Field>
              {sourceField("notes", "Source notes", true, RESEARCH_SNIPPET_MAX)}
              <Field>
                <FieldLabel htmlFor={`${id}-citation-style`}>
                  Citation style
                </FieldLabel>
                <NativeSelect
                  id={`${id}-citation-style`}
                  value={citationStyle}
                  disabled={readOnly || formatting}
                  onChange={(event) =>
                    setCitationStyle(
                      event.target.value as ResearchCitationStyle,
                    )
                  }
                >
                  {RESEARCH_CITATION_STYLES.map((style) => (
                    <NativeSelectOption key={style.id} value={style.id}>
                      {style.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  Formatting runs on this device using only these details.
                  Missing metadata is left out. Name fields format one author.
                  Otherwise author text is kept as entered; review
                  multiple-author references yourself.
                </FieldDescription>
              </Field>
              <Button
                type="button"
                variant="outline"
                disabled={readOnly || formatting || importing}
                onClick={() => void formatSource()}
              >
                {formatting ? "Formatting…" : "Format citation and footnote"}
              </Button>
              {sourceField("citation", "Citation text", true, 4_000)}
              {sourceField("footnote", "Footnote text", true, 4_000)}
              {notice ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {notice}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Review or edit the formatted citation and full reference before
                saving. Insert citation adds your text at the cursor; Insert
                footnote adds the full reference as a numbered document
                footnote.
              </p>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {importing && (
                <p role="status" className="text-sm">
                  Reading local text…
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={readOnly || importing || formatting}
                >
                  Save source
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSourceDraft(null)}
                >
                  Close
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={noteDraft !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNoteDraft(null);
            setError("");
          }
        }}
      >
        <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {readOnly ? "Research note" : "Edit note"}
            </DialogTitle>
            <DialogDescription>
              Your note is stored separately from the draft.
            </DialogDescription>
          </DialogHeader>
          {noteDraft && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveNote();
              }}
            >
              <blockquote className="border-l border-border pl-3 text-sm break-words whitespace-pre-wrap">
                {noteDraft.quote}
              </blockquote>
              <Button
                type="button"
                variant="outline"
                disabled={readOnly || !selectedAnchor}
                onClick={() => {
                  if (selectedAnchor)
                    setNoteDraft({ ...noteDraft, ...selectedAnchor });
                }}
              >
                Relink to selection
              </Button>
              <Field>
                <FieldLabel htmlFor={`${id}-note`}>Note</FieldLabel>
                <Textarea
                  id={`${id}-note`}
                  value={noteDraft.body}
                  rows={5}
                  maxLength={RESEARCH_SNIPPET_MAX}
                  readOnly={readOnly}
                  onChange={(event) =>
                    setNoteDraft({ ...noteDraft, body: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-source`}>Linked source</FieldLabel>
                <NativeSelect
                  id={`${id}-source`}
                  value={noteDraft.sourceId ?? ""}
                  disabled={readOnly}
                  onChange={(event) =>
                    setNoteDraft({
                      ...noteDraft,
                      sourceId: event.target.value || null,
                    })
                  }
                >
                  <NativeSelectOption value="">No source</NativeSelectOption>
                  {value.sources.map((source) => (
                    <NativeSelectOption key={source.id} value={source.id}>
                      {source.title}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={readOnly || !noteDraft.body.trim()}
                >
                  Save note
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNoteDraft(null)}
                >
                  Close
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {confirmation}
    </section>
  );
}
