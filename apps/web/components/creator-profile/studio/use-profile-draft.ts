"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyPortfolio,
  migratePortfolioInput,
  portfolioSchema,
  type PortfolioData,
} from "@/lib/creator-portfolio-schema";
import {
  portfolioDraft,
  portfolioRevision,
} from "@/lib/creator-portfolio-draft";

export type StudioOutcome = {
  outcomeId: string;
  workTitle: string;
  callTitle: string;
  organizationName: string;
  decidedAt: string;
};

export const PREVIEW_OWNER = "design-preview-only";

export type SaveState =
  | { kind: "loading" }
  | { kind: "load-failed"; message: string }
  | { kind: "saved"; at?: number }
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "failed"; message: string; conflict: boolean };

/** Device-local preview drafts may hold data URLs, which the account schema rejects. */
function coerceDraft(raw: unknown, initialName: string): PortfolioData {
  const parsed = portfolioSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const migrated = migratePortfolioInput(raw);
  return {
    ...emptyPortfolio(),
    name: initialName,
    ...(migrated && typeof migrated === "object" ? migrated : {}),
  } as PortfolioData;
}

type LoadResult = { draft: PortfolioData | null; state: SaveState };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function useProfileDraft(
  ownerId: string,
  initialName: string,
  seed?: () => PortfolioData,
) {
  const isAccount = ownerId !== PREVIEW_OWNER;
  const [draft, setDraft] = useState<PortfolioData>(() => ({
    ...emptyPortfolio(),
    name: initialName,
  }));
  const [state, setState] = useState<SaveState>({ kind: "loading" });
  const [uploading, setUploading] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [currentHandle, setCurrentHandle] = useState("");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [changedSincePublish, setChangedSincePublish] = useState(false);
  const [outcomes, setOutcomes] = useState<StudioOutcome[]>([]);
  const version = useRef(0);
  const saved = useRef(0);
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const fetchDraft = useCallback(
    (): Promise<LoadResult> =>
      portfolioDraft<unknown>(ownerId).then(
        (raw) => ({
          draft: raw ? coerceDraft(raw, initialName) : (seed?.() ?? null),
          state: { kind: "saved" },
        }),
        (error: unknown) => ({
          draft: null,
          state: {
            kind: "load-failed",
            message:
              error instanceof Error
                ? error.message
                : "Could not load your draft. Retry before editing.",
          },
        }),
      ),
    [ownerId, initialName, seed],
  );

  const apply = useCallback((result: LoadResult) => {
    if (result.draft) setDraft(result.draft);
    setState(result.state);
  }, []);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    apply(await fetchDraft());
  }, [apply, fetchDraft]);

  useEffect(() => {
    let active = true;
    fetchDraft().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply, fetchDraft]);

  useEffect(() => {
    if (!isAccount) return;
    let active = true;
    Promise.all([
      fetch("/api/me/handles").then((r) => r.json()),
      fetch("/api/creator/portfolio-draft").then((r) => r.json()),
    ])
      .then(([identity, status]) => {
        if (!active) return;
        setCurrentHandle(identity.handle?.handleKey ?? "");
        setPublishedAt(status.publishedAt ?? null);
      })
      .catch(() => undefined);
    fetch("/api/creator/portfolio-outcomes")
      .then((r) => (r.ok ? r.json() : { outcomes: [] }))
      .then((data) => {
        if (active) setOutcomes(data.outcomes ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isAccount]);

  const update = useCallback(
    (change: (current: PortfolioData) => PortfolioData) => {
      version.current += 1;
      setDraft((current) => change(current));
      setChangedSincePublish(true);
      setState((current) =>
        current.kind === "loading" || current.kind === "load-failed"
          ? current
          : { kind: "pending" },
      );
    },
    [],
  );

  const save = useCallback(async () => {
    const at = version.current;
    setState({ kind: "saving" });
    try {
      await portfolioDraft(ownerId, latest.current);
      saved.current = at;
      setState(
        version.current === at
          ? { kind: "saved", at: Date.now() }
          : { kind: "pending" },
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save. Please retry.";
      setState({
        kind: "failed",
        message,
        conflict: /another device|another session/i.test(message),
      });
      return false;
    }
  }, [ownerId]);

  // Autosave after a short pause; never while media uploads or publishing run.
  useEffect(() => {
    if (state.kind !== "pending" || uploading || publishing) return;
    const timer = setTimeout(() => void save(), 700);
    return () => clearTimeout(timer);
  }, [state, uploading, publishing, draft, save]);

  useEffect(() => {
    const unsaved =
      state.kind === "pending" ||
      state.kind === "saving" ||
      (state.kind === "failed" && !state.conflict);
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  const upload = useCallback(
    async (file: File, kind: "image" | "audio"): Promise<string> => {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Choose a file smaller than 20 MB.");
      const ok =
        kind === "audio"
          ? file.type.startsWith("audio/")
          : IMAGE_TYPES.includes(file.type);
      if (!ok)
        throw new Error(
          kind === "audio"
            ? "Choose an audio file (MP3, WAV, OGG, FLAC or M4A)."
            : "Choose a JPG, PNG, WebP or GIF image.",
        );
      setUploading((count) => count + 1);
      try {
        if (!isAccount)
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
        const form = new FormData();
        form.set("file", file);
        const res = await fetch("/api/creator/portfolio-media", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed. Try again.");
        return data.url as string;
      } finally {
        setUploading((count) => count - 1);
      }
    },
    [isAccount],
  );

  const request = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Please try again.");
    return data;
  };

  /** Claims the handle if needed, saves the exact draft, then publishes it. */
  const publish = useCallback(
    async (handle: string) => {
      setPublishing(true);
      try {
        let address = currentHandle;
        if (!address) {
          const data = await request("/api/me/handles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handle }),
          });
          address = data.handle.handleKey;
          setCurrentHandle(address);
        }
        const next = { ...latest.current, handle: address };
        await portfolioDraft(ownerId, next);
        setDraft(next);
        const data = await request("/api/creator/portfolio-publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: portfolioRevision(ownerId) }),
        });
        setPublishedAt(data.publishedAt);
        setChangedSincePublish(false);
        setState({ kind: "saved", at: Date.now() });
        return address;
      } finally {
        setPublishing(false);
      }
    },
    [currentHandle, ownerId],
  );

  const unpublish = useCallback(async () => {
    setPublishing(true);
    try {
      await request("/api/creator/portfolio-publish", { method: "DELETE" });
      setPublishedAt(null);
    } finally {
      setPublishing(false);
    }
  }, []);

  const rename = useCallback(async (handle: string) => {
    setPublishing(true);
    try {
      const data = await request("/api/me/handles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      setCurrentHandle(data.handle.handleKey);
      return data.handle.handleKey as string;
    } finally {
      setPublishing(false);
    }
  }, []);

  return {
    isAccount,
    draft,
    update,
    state,
    save,
    reload: load,
    upload,
    uploading: uploading > 0,
    publishing,
    publish,
    unpublish,
    rename,
    currentHandle,
    publishedAt,
    changedSincePublish,
    outcomes,
  };
}

export type ProfileDraftController = ReturnType<typeof useProfileDraft>;
