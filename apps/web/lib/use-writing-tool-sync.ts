"use client";
import { isWritingEntryId } from "./writing";
import { useEffect, useRef, useState } from "react";
import {
  parseToolData,
  toolLoadIsCurrent,
  type WritingToolKind,
  type WritingToolRecord,
} from "./writing-tool-data";
/** A local recovery envelope never authorizes replacing an unseen account revision. */
export function useWritingToolSync({
  kind,
  scopeId,
  accountId,
  localKey,
  initial,
  hasLocal,
  onAccount,
  enabled = true,
}: {
  kind: WritingToolKind;
  scopeId: string;
  accountId?: string;
  localKey: string;
  initial: unknown;
  hasLocal: boolean;
  onAccount: (value: unknown) => void;
  enabled?: boolean;
}) {
  const active = Boolean(
    accountId &&
    enabled &&
    (kind === "dictionary" || isWritingEntryId(scopeId)),
  );
  const endpoint = `/api/me/writing/tools/${kind}/${encodeURIComponent(scopeId)}`;
  const backupKey = `${localKey}:account-sync`;
  const current = useRef(initial);
  const revision = useRef<number | null>(null);
  const generation = useRef(0);
  const dirty = useRef(hasLocal);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const loadToken = useRef(0);
  const inFlight = useRef(false);
  const loadAgain = useRef<() => void>(() => {});
  const apply = useRef(onAccount);
  apply.current = onAccount;
  const [status, setStatus] = useState(
    active ? "Opening account copy…" : "Kept on this device.",
  );
  const [conflict, setConflict] = useState<WritingToolRecord | null>(null);
  const conflictRef = useRef<WritingToolRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [retainedRecovery, setRetainedRecovery] = useState(false);
  const blockedRecovery = useRef(false);
  const unreadableRecovery = useRef<string | null>(null);
  function recover() {
    if (blockedRecovery.current) return false;
    try {
      localStorage.setItem(
        backupKey,
        JSON.stringify({
          data: current.current,
          baseRevision: revision.current,
          dirty: dirty.current,
          conflict: conflictRef.current,
        }),
      );
      return true;
    } catch {
      setStatus(
        "Device storage is unavailable. Download a backup before closing.",
      );
      return false;
    }
  }
  async function save() {
    if (
      !active ||
      revision.current === null ||
      conflictRef.current ||
      !dirty.current ||
      inFlight.current
    )
      return;
    inFlight.current = true;
    const sent = current.current,
      version = generation.current;
    if (alive.current) setBusy(true);
    let continueAfterClose = false;
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: sent, baseRevision: revision.current }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!alive.current) {
        if (response.ok && result.record) {
          revision.current = result.record.revision;
          if (version === generation.current) dirty.current = false;
          recover();
          continueAfterClose = dirty.current;
        } else if (response.status === 409 && result.current) {
          conflictRef.current = result.current;
          recover();
        }
        return;
      }
      if (response.status === 409 && result.current) {
        const account = {
          revision: result.current.revision,
          data: parseToolData(kind, result.current.data),
        };
        conflictRef.current = account;
        setConflict(account);
        recover();
        setStatus(
          "Another device changed this copy. Both versions are kept here.",
        );
        return;
      }
      if (!response.ok || !result.record) throw new Error();
      revision.current = result.record.revision;
      if (version === generation.current) dirty.current = false;
      recover();
      setStatus(
        dirty.current
          ? "New edits are kept here; saving again…"
          : "Saved to your account.",
      );
      if (dirty.current) timer.current = setTimeout(() => void save(), 300);
    } catch {
      if (alive.current) {
        recover();
        setStatus(
          "Account save is unavailable. Your device copy is kept; retry when connected.",
        );
      }
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
      else if (continueAfterClose) void save();
    }
  }
  function edit(value: unknown) {
    current.current = value;
    generation.current++;
    dirty.current = true;
    recover();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 700);
  }
  useEffect(() => {
    alive.current = true;
    if (!active) return;
    let canceled = false;
    if (generation.current === 0) {
      current.current = initial;
      dirty.current = hasLocal;
    }
    const load = () => {
      const token = ++loadToken.current;
      const started = generation.current;
      void fetch(endpoint, { cache: "no-store" })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok || !result.record) throw new Error();
          if (
            canceled ||
            !toolLoadIsCurrent(
              token,
              loadToken.current,
              result.record.revision,
              revision.current,
            )
          )
            return;
          const account = {
            revision: result.record.revision,
            data: parseToolData(kind, result.record.data),
          };
          let previous: number | null = null;
          let raw: string | null = null;
          try {
            raw = localStorage.getItem(backupKey);
            if (raw) {
              const recovery = JSON.parse(raw);
              if (recovery.dirty && generation.current === started) {
                current.current = parseToolData(kind, recovery.data);
                apply.current(current.current);
                dirty.current = true;
              }
              previous = Number.isSafeInteger(recovery.baseRevision)
                ? recovery.baseRevision
                : null;
            }
          } catch {
            unreadableRecovery.current = raw;
            if (raw !== null) {
              try {
                localStorage.setItem(
                  `${backupKey}:unreadable:${crypto.randomUUID()}`,
                  raw,
                );
                localStorage.removeItem(backupKey);
                setRetainedRecovery(true);
              } catch {
                blockedRecovery.current = true;
              }
            }
            setStatus(
              "The saved recovery copy could not be read. Download a backup, then retry.",
            );
            return;
          }
          const same =
            JSON.stringify(current.current) === JSON.stringify(account.data);
          if (
            dirty.current &&
            !same &&
            account.revision > 0 &&
            previous !== account.revision
          ) {
            conflictRef.current = account;
            setConflict(account);
            revision.current = previous;
            recover();
            setStatus(
              "Device and account copies differ. Choose which to keep; both can be downloaded.",
            );
            return;
          }
          revision.current = account.revision;
          if (!dirty.current || same) {
            current.current = account.data;
            dirty.current = false;
            apply.current(account.data);
            recover();
            setStatus("Account copy opened.");
          } else {
            recover();
            void save();
          }
        })
        .catch(() => {
          if (!canceled)
            setStatus(
              "Account copy is unavailable. Your device notes are kept. Retry when connected.",
            );
        });
    };
    loadAgain.current = load;
    load();
    const retry = () => {
      if (revision.current !== null) void save();
      else load();
    };
    window.addEventListener("online", retry);
    return () => {
      canceled = true;
      void save();
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("online", retry);
    };
    // Scoped components are keyed by account and piece; callback refs avoid resetting live recovery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, endpoint, backupKey]);
  function download() {
    const recoveryCopies: unknown[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key?.startsWith(`${backupKey}:conflict:`) ||
          key?.startsWith(`${backupKey}:unreadable:`)
        )
          recoveryCopies.push({ key, raw: localStorage.getItem(key) });
      }
    } catch {
      /* Current copies remain downloadable. */
    }
    const blob = new Blob(
      [
        JSON.stringify(
          {
            kind,
            scopeId,
            recoveryCopies,
            unreadableRecovery: unreadableRecovery.current,
            local: current.current,
            account: conflictRef.current,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `missa-${kind}-copies.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function resolve(useLocal: boolean) {
    const account = conflictRef.current;
    if (!account) return;
    try {
      localStorage.setItem(
        `${backupKey}:conflict:${crypto.randomUUID()}`,
        JSON.stringify({ local: current.current, account }),
      );
    } catch {
      setStatus(
        "Both copies must be downloaded before resolving; device storage is unavailable.",
      );
      return;
    }
    revision.current = account.revision;
    conflictRef.current = null;
    setConflict(null);
    if (!useLocal) {
      current.current = account.data;
      apply.current(account.data);
      dirty.current = false;
      generation.current++;
      recover();
      setStatus(
        "Account copy opened. Your earlier device copy is kept for recovery.",
      );
    } else {
      dirty.current = true;
      recover();
      void save();
    }
  }
  return {
    edit,
    status,
    needsRecovery:
      retainedRecovery ||
      /unavailable|could not|couldn.t|retry|recovery|differ/i.test(status),
    conflict,
    busy,
    download,
    resolve,
    retry: () => (revision.current === null ? loadAgain.current() : save()),
  };
}
