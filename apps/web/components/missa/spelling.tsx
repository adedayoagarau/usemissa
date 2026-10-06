"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hasSignedInHint } from "@/lib/signedInHint";
import { SPELLING_COOKIE, parseSpelling, sp, type Spelling } from "@/lib/spelling";

const SpellingContext = createContext<Spelling>("us");

const UK_TIME_ZONES = new Set(["Europe/London", "Europe/Belfast", "Europe/Jersey", "Europe/Guernsey", "Europe/Isle_of_Man"]);

function rememberedSpelling(): Spelling | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SPELLING_COOKIE}=([^;]*)`));
  return parseSpelling(match?.[1]);
}

// Only ask the server when the answer could be UK: a signed-in account (its
// country decides), or a browser that looks like it's in the UK.
function worthAsking(): boolean {
  if (hasSignedInHint()) return true;
  try {
    if (UK_TIME_ZONES.has(Intl.DateTimeFormat().resolvedOptions().timeZone)) return true;
  } catch {
    // No time zone; check the language list instead.
  }
  return navigator.languages?.some((language) => language.toLowerCase() === "en-gb") ?? false;
}

/**
 * Every page renders in US spelling first, so pages served from the CDN stay
 * cacheable, then switches to UK spelling for UK readers after it loads.
 */
export function SpellingProvider({ children }: { children: ReactNode }) {
  const [spelling, setSpelling] = useState<Spelling>("us");

  useEffect(() => {
    const remembered = rememberedSpelling();
    if (remembered) {
      // Read after hydration so the server's US render always matches.
      setSpelling(remembered); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    if (!worthAsking()) return;
    let cancelled = false;
    fetch("/api/spelling", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { spelling?: string } | null) => {
        const answer = parseSpelling(body?.spelling);
        if (answer && !cancelled) setSpelling(answer);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <SpellingContext.Provider value={spelling}>{children}</SpellingContext.Provider>;
}

export function useSpelling(): Spelling {
  return useContext(SpellingContext);
}

/** Returns a function that puts Missa copy in the reader's spelling. */
export function useSp(): (text: string) => string {
  const spelling = useSpelling();
  return (text) => sp(text, spelling);
}

/** Missa copy in the reader's spelling, usable from server components. */
export function Sp({ children }: { children: string }) {
  return <>{sp(children, useSpelling())}</>;
}
