"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  WritingPages,
  viewMounted,
  type PageEditors,
} from "@/components/missa/writing-pages";
import { WritingFind } from "@/components/missa/writing-find";
import {
  WritingFormatBar,
  WritingFormatSheet,
} from "@/components/missa/writing-format";
import {
  manuscriptHeadings,
  manuscriptSearchDocument,
  type ManuscriptPiece,
} from "@/lib/writing-manuscript";
import type { WritingDocument } from "@/lib/writing-document";

/** Each piece retains its own undo and page commands; the shared map is for search only. */
class PieceEditors extends Map<string, Editor> {
  constructor(
    private pieceId: string,
    private shared: PageEditors,
  ) {
    super();
  }
  override set(key: string, value: Editor) {
    this.shared.set(`${this.pieceId}/${key}`, value);
    return super.set(key, value);
  }
  override delete(key: string) {
    this.shared.delete(`${this.pieceId}/${key}`);
    return super.delete(key);
  }
}

function ManuscriptSection({
  piece,
  shared,
  readOnly,
  onChange,
  onActiveEditor,
  onSelection,
  accessibleLabelPrefix,
  formattingActive,
}: {
  piece: ManuscriptPiece;
  shared: PageEditors;
  readOnly: boolean;
  onChange: (doc: WritingDocument) => void;
  onActiveEditor?: (editor: Editor) => void;
  onSelection?: (pieceId: string, selection: string) => void;
  accessibleLabelPrefix: string;
  formattingActive: boolean;
}) {
  const [editors] = useState(() => new PieceEditors(piece.id, shared));
  const [active, setActive] = useState<{
    pageId: string;
    editor: Editor;
  } | null>(null);
  const [formatOpen, setFormatOpen] = useState(false);
  useEffect(() => {
    const editor = active?.editor;
    if (!editor || !onSelection) return;
    const report = () => {
      const { from, to } = editor.state.selection;
      onSelection(piece.id, editor.state.doc.textBetween(from, to, "\n"));
    };
    report();
    editor.on("selectionUpdate", report);
    return () => {
      editor.off("selectionUpdate", report);
    };
  }, [active, onSelection, piece.id]);
  const pageIndex = piece.doc.pages.findIndex(
    (page) => page.id === active?.pageId.split("/")[0],
  );
  return (
    <section
      aria-label={accessibleLabelPrefix}
      className="border-b border-border last:border-b-0"
      data-manuscript-piece={piece.id}
    >
      <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-3 px-4 pt-8 print:hidden">
        <h2 className="font-heading text-2xl break-words">
          {piece.title.trim() || "Untitled piece"}
        </h2>
        {!readOnly && formattingActive ? (
          <WritingFormatBar
            editor={active?.editor ?? null}
            document={piece.doc}
            onOpenFormat={() => setFormatOpen(true)}
          />
        ) : null}
      </div>
      <WritingPages
        accessibleLabelPrefix={accessibleLabelPrefix}
        document={piece.doc}
        onChange={onChange}
        view="draft"
        spellcheck={false}
        readOnly={readOnly}
        editors={editors}
        onActiveEditor={(pageId, editor) => {
          setActive({ pageId, editor });
          onActiveEditor?.(editor);
        }}
      />
      {!readOnly ? (
        <WritingFormatSheet
          open={formatOpen}
          onOpenChange={setFormatOpen}
          document={piece.doc}
          pageIndex={Math.max(0, pageIndex)}
          onDocumentChange={onChange}
        />
      ) : null}
    </section>
  );
}

/**
 * Live project editing, in binder order. The parent supplies loaded documents
 * and routes each change to WritingSync by piece id; this component neither
 * fetches nor saves. Stable piece ids keep separate editors and undo histories.
 * Search uses a transient namespaced projection and writes to original editors.
 */
export function WritingManuscript({
  pieces,
  onChangePiece,
  readOnly,
  onActiveEditor,
  onSelection,
}: {
  pieces: ManuscriptPiece[];
  onChangePiece: (id: string, doc: WritingDocument) => void;
  readOnly: boolean;
  onActiveEditor?: (editor: Editor) => void;
  onSelection?: (pieceId: string, selection: string) => void;
}) {
  const id = useId();
  const [editors] = useState<PageEditors>(() => new Map());
  const [finding, setFinding] = useState(false);
  const [outline, setOutline] = useState(false);
  const [activePieceId, setActivePieceId] = useState<string | null>(null);
  const searchDocument = useMemo(
    () => manuscriptSearchDocument(pieces),
    [pieces],
  );
  const headings = useMemo(() => manuscriptHeadings(pieces), [pieces]);
  function goToPiece(pieceId: string) {
    const region = document.getElementById(id);
    const section = [
      ...(region?.querySelectorAll<HTMLElement>("[data-manuscript-piece]") ??
        []),
    ].find((element) => element.dataset.manuscriptPiece === pieceId);
    section?.scrollIntoView({ block: "start", behavior: "auto" });
    const piece = pieces.find((item) => item.id === pieceId);
    const page = piece?.doc.pages[0];
    const key =
      page?.kind === "canvas" ? `${page.id}/${page.blocks?.[0]?.id}` : page?.id;
    const editor = key ? editors.get(`${pieceId}/${key}`) : undefined;
    if (editor && viewMounted(editor)) editor.commands.focus("start");
  }
  return (
    <div id={id} className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 print:hidden">
        <Button
          variant="outline"
          onClick={() => setFinding((open) => !open)}
          aria-expanded={finding}
          disabled={!pieces.length}
        >
          Find in project
        </Button>
        <Button
          variant="ghost"
          onClick={() => setOutline((open) => !open)}
          aria-expanded={outline}
          aria-controls={`${id}-outline`}
          disabled={!pieces.length}
        >
          Project outline
        </Button>
        <p className="text-sm text-muted-foreground">
          Each piece saves separately.
        </p>
      </div>
      {finding && searchDocument ? (
        <WritingFind
          document={searchDocument}
          editors={editors}
          readOnly={readOnly}
          onClose={() => setFinding(false)}
        />
      ) : null}
      {outline ? (
        <nav
          id={`${id}-outline`}
          aria-label="Project outline"
          className="flex max-h-64 flex-col gap-1 overflow-y-auto border-b border-border px-4 py-3 print:hidden"
        >
          {pieces.map((piece) => (
            <div key={piece.id}>
              <Button variant="ghost" onClick={() => goToPiece(piece.id)}>
                <span className="max-w-56 truncate">
                  {piece.title.trim() || "Untitled piece"}
                </span>
              </Button>
              {headings
                .filter((heading) => heading.pieceId === piece.id)
                .map((heading) => (
                  <div
                    key={`${heading.editorKey}/${heading.position}`}
                    className="ps-4"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const editor = editors.get(
                          `${heading.pieceId}/${heading.editorKey}`,
                        );
                        if (editor && viewMounted(editor))
                          editor.commands.focus(heading.position, {
                            scrollIntoView: true,
                          });
                      }}
                    >
                      <span className="max-w-48 truncate">{heading.label}</span>
                    </Button>
                  </div>
                ))}
            </div>
          ))}
        </nav>
      ) : null}
      {!pieces.length ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">
          Add a piece to this project to start writing.
        </p>
      ) : (
        pieces.map((piece, index) => (
          <ManuscriptSection
            key={piece.id}
            piece={piece}
            accessibleLabelPrefix={`Piece ${index + 1}: ${piece.title.trim() || "Untitled piece"}`}
            formattingActive={piece.id === activePieceId}
            shared={editors}
            readOnly={readOnly}
            onChange={(doc) => onChangePiece(piece.id, doc)}
            onActiveEditor={(editor) => { setActivePieceId(piece.id); onActiveEditor?.(editor); }}
            onSelection={onSelection}
          />
        ))
      )}
    </div>
  );
}
