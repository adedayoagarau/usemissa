"use client";
import { useEffect, useState } from "react";
import { Globe, ArrowUpRight } from "lucide-react";
import { publicWebUrl } from "@/lib/creator-portfolio-draft";
import { Button } from "./ui/button";
import styles from "./creator-portfolio-studio.module.css";
export function PortfolioLinkPreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const valid = publicWebUrl(url);
  const [result, setResult] = useState<{
    url: string;
    title?: string;
    description?: string;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/portfolio-link-preview?url=${encodeURIComponent(valid)}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ url: valid, ...data });
      } catch {
        if (!controller.signal.aborted)
          setResult({
            url: valid,
            error: "Preview unavailable. Your link will still open.",
          });
      }
    }, 650);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [valid, retry]);
  if (!url) return null;
  if (!valid)
    return (
      <p role="status" className={styles.hint}>
        Use a full link beginning with https:// or http://.
      </p>
    );
  const current = result?.url === valid ? result : null;
  return (
    <section
      className={styles.linkPreview}
      aria-label="Link preview"
      aria-busy={!current}
    >
      <p className={styles.eyebrow}>
        <Globe aria-hidden="true" />
        {new URL(valid).hostname}
      </p>
      <h3>{current?.title || title || "Your linked work"}</h3>
      {!current ? (
        <p role="status">Loading link preview…</p>
      ) : (
        <p>
          {current.description ||
            current.error ||
            "Ready to open from your portfolio."}
        </p>
      )}
      <a href={valid} target="_blank" rel="noopener noreferrer">
        Open link
        <ArrowUpRight aria-label="opens in new tab" />
      </a>
      {current?.error && (
        <Button
          variant="ghost"
          onClick={() => {
            setResult(null);
            setRetry(retry + 1);
          }}
        >
          Try preview again
        </Button>
      )}
    </section>
  );
}
