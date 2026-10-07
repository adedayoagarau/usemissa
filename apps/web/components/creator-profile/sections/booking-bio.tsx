"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heading } from "./shared";
import styles from "./booking-section.module.css";

type CopyState = "idle" | "copied" | "failed";

/**
 * A bio as plain text with a Copy button, for a programmer pasting it into a
 * programme. The button says what it did ("Copied") and announces it; if the
 * browser refuses the clipboard, it says so and selects the text to copy by
 * hand, so the bio is never out of reach.
 */
export function BookingBio({
  label,
  text,
  level,
}: {
  label: string;
  text: string;
  level: number;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const paragraph = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 3000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      const selection = window.getSelection();
      if (selection && paragraph.current)
        selection.setBaseAndExtent(
          paragraph.current,
          0,
          paragraph.current,
          paragraph.current.childNodes.length,
        );
      setState("failed");
    }
  };

  return (
    <div className={styles.bio}>
      <div className={styles.bioHead}>
        <Heading level={level} className={styles.bioLabel}>
          {label}
        </Heading>
        <Button type="button" variant="outline" onClick={copy}>
          {state === "copied" ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          {state === "copied" ? "Copied" : "Copy"}
          <span className="sr-only"> {label.toLowerCase()}</span>
        </Button>
      </div>
      <p ref={paragraph} className={styles.bioText}>
        {text}
      </p>
      <p role="status" className={styles.bioStatus}>
        {state === "copied" && `${label} copied.`}
        {state === "failed" &&
          `Couldn’t copy. The ${label.toLowerCase()} is selected, so you can copy it yourself.`}
      </p>
    </div>
  );
}
