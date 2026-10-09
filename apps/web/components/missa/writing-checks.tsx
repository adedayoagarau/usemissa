"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { PageEditors } from "@/components/missa/writing-pages";
import { readingOrder, type WritingDocument } from "@/lib/writing-document";
import { checkRange, extractCheckText } from "@/lib/writing-check-text";
import type { WritingCheck, WritingChecker, WritingCheckPreferences } from "@/lib/writing-checker";

type Result = WritingCheck & { key: string; source: string; page: number; id: number };
const MAX_CHARACTERS = 200_000;
const MAX_RESULTS = 100;

/** Checks only on request. Text stays in a local worker; edits use the editor's undo history. */
export function WritingChecks({ document, editors, readOnly, onClose, preferenceKey, dictionaryKey = "missa-writing-dictionary", selectionKey }: {
  preferenceKey?: string;
  dictionaryKey?: string;
  selectionKey?: string;
  document: WritingDocument;
  editors: PageEditors;
  readOnly: boolean;
  onClose: () => void;
}) {
  const storageKey = preferenceKey ? `missa-writing-checks:${preferenceKey}` : null;
  const [preferences, setPreferences] = useState<WritingCheckPreferences>({ dialect: 0, words: [], disabledRules: [], ignoredHashes: [] });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
    try {
      const stored = storageKey ? JSON.parse(localStorage.getItem(storageKey) || "null") : null;
      const words = JSON.parse(localStorage.getItem(dictionaryKey) || "[]");
      setPreferences({ dialect: [0, 1, 2, 3, 4].includes(stored?.dialect) ? stored.dialect : 0, words: Array.isArray(words) ? words.filter((v): v is string => typeof v === "string" && v.length <= 100).slice(0, 2000) : [], disabledRules: Array.isArray(stored?.disabledRules) ? stored.disabledRules.filter((v: unknown) => typeof v === "string" && v.length <= 100).slice(0, 500) : [], ignoredHashes: Array.isArray(stored?.ignoredHashes) ? stored.ignoredHashes.filter((v: unknown) => typeof v === "string" && v.length <= 20 && /^\d+$/.test(v)).slice(0, 2000) : [] });
    } catch { /* Storage may be unavailable; checks still work. */ }
    setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [storageKey, dictionaryKey]);
  function remember(next: WritingCheckPreferences) {
    setPreferences(next);
    setChecked(null);
    setResults([]);
    try {
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify({ dialect: next.dialect, disabledRules: next.disabledRules, ignoredHashes: next.ignoredHashes }));
      localStorage.setItem(dictionaryKey, JSON.stringify(next.words));
      setNotice(storageKey ? "Preferences saved for this piece on this device." : "Dictionary saved on this device. Piece preferences last while checks are open.");
    } catch { setNotice("Preferences apply now. This browser couldn't save them for later."); }
  }
  const checker = useRef<WritingChecker | null>(null);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [checked, setChecked] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [notice, setNotice] = useState("");
  const sources = useMemo(() => document.pages.flatMap((page, index) => {
    const keys = page.kind === "canvas"
      ? readingOrder(page.blocks ?? []).map((block) => `${page.id}/${block.id}`)
      : [page.id];
    return keys.flatMap((key) => {
      const editor = editors.get(key);
      return editor && !editor.isDestroyed
        ? [{ key, page: index + 1, text: extractCheckText(editor.state.doc).text }]
        : [];
    });
  }), [document, editors]);
  const signature = JSON.stringify(sources);
  const latest = useRef(signature);
  useEffect(() => { latest.current = signature; }, [signature]);
  const stale = checked !== null && checked !== signature;

  useEffect(() => () => {
    request.current += 1;
    checker.current?.dispose();
    checker.current = null;
  }, []);

  async function run(selectionOnly = false) {
    const id = ++request.current;
    setBusy(true);
    setError("");
    setNotice("");
    setResults([]);
    setChecked(null);
    const requestedSources = sources.flatMap((source) => {
      if (selectionOnly && selectionKey && source.key !== selectionKey) return [];
      const editor = editors.get(source.key);
      if (!editor || editor.isDestroyed) return [];
      const selection = editor.state.selection;
      if (!selectionOnly) return [{ ...source, offset: 0, checkText: source.text }];
      if (selection.empty) return [];
      const extracted = extractCheckText(editor.state.doc);
      const start = extracted.positions.findIndex((position) => position >= selection.from);
      let end = extracted.positions.findIndex((position) => position >= selection.to);
      if (end < 0) end = extracted.text.length;
      return start < 0 || end <= start ? [] : [{ ...source, offset: start, checkText: source.text.slice(start, end) }];
    });
    if (selectionOnly && !requestedSources.length) {
      setError("Select text in the editor before checking a selection.");
      setBusy(false);
      return;
    }
    if (requestedSources.reduce((total, source) => total + source.checkText.length, 0) > MAX_CHARACTERS) {
      setError("This piece is too long to check at once. Check a shorter piece in your project.");
      setBusy(false);
      return;
    }
    try {
      if (!checker.current) {
        const { createWritingChecker } = await import("@/lib/writing-checker");
        const instance = await createWritingChecker();
        if (id !== request.current) { instance.dispose(); return; }
        checker.current = instance;
      }
      const found: Result[] = [];
      let truncated = false;
      for (const source of requestedSources) {
        const editor = editors.get(source.key);
        if (!source.text.trim() || !editor || editor.isDestroyed) continue;
        const issues = await checker.current.check(source.checkText, preferences);
        if (id !== request.current) return;
        for (const rawIssue of issues) {
          const issue = { ...rawIssue, start: rawIssue.start + source.offset, end: rawIssue.end + source.offset };
          // Never offer a replacement across a structural boundary.
          const range = checkRange(editor.state.doc, source.text, issue.start, issue.end);
          if (!range) continue;
          if (found.length === MAX_RESULTS) { truncated = true; break; }
          found.push({ ...issue, key: source.key, source: source.text, page: source.page, id: found.length });
        }
        if (truncated) break;
      }
      if (latest.current !== signature) {
        setError("The text changed during the check. Check again for current suggestions.");
        return;
      }
      setResults(found);
      setLimited(truncated);
      setChecked(signature);
    } catch {
      if (id === request.current) {
        checker.current?.dispose();
        checker.current = null;
        setError("Couldn’t load writing checks. Your writing is safe. Try again when you’re connected.");
      }
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  function apply(result: Result, replacement: string) {
    const editor = editors.get(result.key);
    if (!editor || editor.isDestroyed || readOnly || stale) return;
    const range = checkRange(editor.state.doc, result.source, result.start, result.end);
    if (!range) { setError("The text changed. Check again before applying this suggestion."); return; }
    editor.view.dispatch(editor.state.tr.insertText(replacement, range.from, range.to));
    setNotice("Suggestion applied. You can undo it in the editor. Check again for current suggestions.");
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-dvh grid-cols-1 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Writing checks</DialogTitle>
          <DialogDescription>
            Optional spelling and grammar suggestions for English. Harper checks this piece on your device. Text isn’t sent to a checking service. You choose what to change.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="writing-checks-dialect">English variety</FieldLabel>
          <NativeSelect className="w-full min-w-0" id="writing-checks-dialect" value={preferences.dialect} disabled={busy || !loaded} onChange={(event) => remember({ ...preferences, dialect: Number(event.target.value) })}>
            {["American", "British", "Australian", "Canadian", "Indian"].map((label, index) => <NativeSelectOption key={label} value={index}>{label}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" onClick={() => void run()} disabled={busy || readOnly || !loaded} aria-busy={busy || undefined}>
            {busy ? "Checking…" : checked === null ? "Check this piece" : "Check again"}
          </Button>
          <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="outline" disabled={busy || readOnly || !loaded || !sources.some((source) => (!selectionKey || source.key === selectionKey) && !editors.get(source.key)?.state.selection.empty)} onClick={() => void run(true)}>Check selection</Button>
          <p role="status" className="text-sm text-muted-foreground">
            {busy ? "Loading or checking on this device…" : notice || (stale
              ? "The text changed. Check again for current suggestions."
              : checked !== null ? results.length
                ? `${results.length} suggestions to review${limited ? " (first 100)" : ""}.`
                : "No remaining suggestions. This check can miss errors."
              : "Checks run only when you ask.")}
          </p>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {!stale && results.length ? (
          <ol className="flex min-w-0 flex-col divide-y divide-border">
            {results.map((result) => (
              <li key={result.id} className="flex min-w-0 flex-col gap-3 py-4">
                <p className="text-xs text-muted-foreground">Page {result.page} · {result.rule}</p>
                <p className="break-words text-sm">{result.message}</p>
                <p className="whitespace-pre-wrap break-words text-muted-foreground">
                  {result.source.slice(Math.max(0, result.start - 40), result.start)}
                  <strong className="font-semibold text-foreground">{result.source.slice(result.start, result.end)}</strong>
                  {result.source.slice(result.end, result.end + 40)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.replacements.map((replacement, index) => (
                    <div key={index} className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="break-words">{replacement ? `“${replacement}”` : "Remove this text"}</span>
                      <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="outline" disabled={readOnly || busy}
                        aria-label={replacement ? `Apply replacement ${replacement}` : "Apply removal"}
                        onClick={() => apply(result, replacement)}>Apply</Button>
                    </div>
                  ))}
                  {/spell|splitwords/i.test(result.rule) && result.end - result.start <= 100 && /^[\p{L}\p{M}'’-]+$/u.test(result.source.slice(result.start, result.end)) ? <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="ghost" disabled={busy} onClick={() => remember({ ...preferences, words: [...new Set([...preferences.words, result.source.slice(result.start, result.end)])].slice(-2000) })}>Add to dictionary</Button> : null}
                  <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="ghost" disabled={busy} onClick={() => remember({ ...preferences, disabledRules: [...new Set([...preferences.disabledRules, result.rule])] })}>Turn off this rule</Button>
                  {result.hash ? <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="ghost" disabled={busy} onClick={() => remember({ ...preferences, ignoredHashes: [...new Set([...preferences.ignoredHashes, result.hash!])].slice(-2000) })}>Keep this wording</Button> : null}
                  <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="ghost" onClick={() => {
                    setResults((value) => value.filter((item) => item.id !== result.id));
                    setNotice("Suggestion ignored for this check.");
                  }}>Ignore</Button>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        {(preferences.disabledRules.length || preferences.ignoredHashes.length || preferences.words.length) ? <div className="flex flex-wrap gap-2">
          <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="outline" disabled={busy} onClick={() => remember({ ...preferences, disabledRules: [], ignoredHashes: [] })}>Reset piece rules and wording</Button>
          <Button className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal" variant="outline" disabled={busy} onClick={() => remember({ ...preferences, words: [] })}>Clear personal dictionary</Button>
          <p className="text-xs text-muted-foreground">{preferences.words.length} dictionary words · {preferences.disabledRules.length} disabled rules · {preferences.ignoredHashes.length} kept wordings. Preferences stay on this device.</p>
        </div> : null}
        <p className="text-xs text-muted-foreground">Ignore suggestions that don’t fit your voice. The checker downloads the first time you use it.</p>
      </DialogContent>
    </Dialog>
  );
}
