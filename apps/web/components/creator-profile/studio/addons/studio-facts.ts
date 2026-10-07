"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activeModules,
  type PortfolioData,
  type ServerFacts,
} from "@/lib/creator-portfolio-schema";
import {
  MAX_COLLABORATOR_LOOKUPS,
  collaboratorHandleKey,
  studioServerFacts,
  type CollaboratorCheck,
  type CollaboratorLookup,
} from "@/lib/portfolio-collaborators";

/**
 * What the studio knows from the server about the add-ons, so the preview
 * shows what a visitor will see rather than what was typed. Credits are
 * checked by the authenticated status endpoint; a device-only preview has no
 * server and keeps the flags its sample came with.
 */
export type CollaboratorFacts = {
  /** idle: nothing to check; loading: first answer pending; error: last try failed. */
  state: "idle" | "loading" | "ready" | "error";
  message: string;
  /** Your own handle, null when none is claimed, undefined until known. */
  yourHandle: string | null | undefined;
  /** The answer for each credited handle, by handle key. */
  lookups: ReadonlyMap<string, CollaboratorLookup>;
  refresh: () => void;
};

export type StudioFacts = {
  /** For `withServerProvenance` in the preview. */
  server: ServerFacts;
  collaborators: CollaboratorFacts;
};

const NO_LOOKUPS: ReadonlyMap<string, CollaboratorLookup> = new Map();

/** How long to wait after the last keystroke before asking the server. */
const TYPING_PAUSE_MS = 450;

export function useStudioFacts(
  draft: PortfolioData,
  isAccount: boolean,
): StudioFacts {
  const keys = useMemo(
    () =>
      [
        ...new Set(
          draft.collaborators
            .map((entry) => collaboratorHandleKey(entry.handle))
            .filter((key): key is string => Boolean(key)),
        ),
      ]
        .slice(0, MAX_COLLABORATOR_LOOKUPS)
        .join(","),
    [draft.collaborators],
  );
  const switchedOn = activeModules(draft.modules).some(
    (module) => module.id === "collaborators",
  );
  const enabled = isAccount && switchedOn && keys !== "";
  const [lookups, setLookups] =
    useState<ReadonlyMap<string, CollaboratorLookup>>(NO_LOOKUPS);
  const [yourHandle, setYourHandle] = useState<string | null | undefined>();
  const [state, setState] = useState<CollaboratorFacts["state"]>("idle");
  const [message, setMessage] = useState("");
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((current) => current + 1), []);

  // The window regaining focus is when a collaborator is most likely to have
  // just credited you back in another tab.
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => setTick((current) => current + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState((current) => (current === "ready" ? current : "loading"));
      try {
        const response = await fetch(
          `/api/creator/portfolio-collaborators?handles=${encodeURIComponent(keys)}`,
          { signal: controller.signal },
        );
        const data = (await response.json().catch(() => ({}))) as Partial<
          CollaboratorCheck & { error: string }
        >;
        if (!response.ok || !Array.isArray(data.collaborators))
          throw new Error(data.error || "Could not check your credits.");
        setLookups(
          new Map(data.collaborators.map((entry) => [entry.handle, entry])),
        );
        setYourHandle(data.yourHandle ?? null);
        setState("ready");
        setMessage("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setState("error");
        setMessage(
          error instanceof Error && error.message
            ? error.message
            : "Could not check your credits.",
        );
      }
    }, TYPING_PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, keys, tick]);

  const server = useMemo(
    () => studioServerFacts(draft, isAccount ? lookups : undefined),
    [draft, isAccount, lookups],
  );
  return {
    server,
    collaborators: {
      state: enabled ? state : "idle",
      message,
      yourHandle,
      lookups,
      refresh,
    },
  };
}
