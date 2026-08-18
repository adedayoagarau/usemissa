"use client";

import { usePathname } from "next/navigation";
import { Blobatar } from "blobatar/react";
import { pickNotFoundPoem } from "@/lib/not-found-poetry";
import styles from "@/app/not-found.module.css";

/** A literary epigraph, picked deterministically from the broken path. */
export function NotFoundEpigraph() {
  const pathname = usePathname() ?? "/";
  const poem = pickNotFoundPoem(pathname);

  return (
    <blockquote className={styles.epigraph}>
      {poem.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <cite>{poem.attribution}</cite>
    </blockquote>
  );
}

/** A quiet stamp: the record this address would have had, if Missa had one. */
export function NotFoundMark() {
  const pathname = usePathname() ?? "/";

  return (
    <p className={styles.mark}>
      <Blobatar name={pathname} size={20} className={styles.markBlob} alt="" />
      Error 404 — no record for <code>{pathname}</code>
    </p>
  );
}
