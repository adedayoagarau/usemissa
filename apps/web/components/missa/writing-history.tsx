"use client";
import { useEffect, useRef, useState } from "react";
import type { WritingContent } from "@/lib/writing";
import { initializeWritingHistory, WritingHistoryRecorder } from "@/lib/writing-history";

export function useAutomaticWritingHistory({ entryId, content, enabled }: { entryId: string; content: WritingContent; enabled: boolean }) {
  const latest = useRef(content);
  const recorders = useRef(new Map<string, WritingHistoryRecorder>());
  useEffect(() => {
    latest.current = content;
    initializeWritingHistory(recorders.current, entryId, content, enabled);
  }, [entryId, content, enabled]);
  const [state, setState] = useState<"ready" | "saving" | "saved" | "attention">("ready");
  useEffect(() => {
    if (!enabled) return;
    let disposed = false, busy = false;
    queueMicrotask(() => { if (!disposed) setState("ready"); });
    const checkpoint = async () => {
      if (disposed || busy || !navigator.onLine) return;
      const recorder = recorders.current.get(entryId);
      if (!recorder) return;
      const version = recorder.checkpoint(latest.current, Date.now());
      if (!version) return;
      busy = true; setState("saving");
      try {
        const response = await fetch(`/api/me/writing/${encodeURIComponent(entryId)}/snapshots`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: version.id, name: "", ...version.content }) });
        const result = await response.json().catch(() => null);
        if (response.ok && result?.snapshot?.id === version.id) { recorder.confirmed(Date.now()); if (!disposed) setState("saved"); }
        else if (!disposed) setState("attention");
      } catch { if (!disposed) setState("attention"); }
      finally { busy = false; }
    };
    // A short edit gets both its starting version and a changed version after a pause.
    const initial = setTimeout(() => void checkpoint(), 15_000);
    const timer = setInterval(() => void checkpoint(), 30_000);
    window.addEventListener("online", checkpoint);
    return () => { disposed = true; clearTimeout(initial); clearInterval(timer); window.removeEventListener("online", checkpoint); };
  }, [entryId, enabled]);
  return state;
}
