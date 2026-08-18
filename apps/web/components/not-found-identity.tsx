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

/** The record this address would have had, if Missa had one. */
export function NotFoundPlate() {
  const pathname = usePathname() ?? "/";

  return (
    <div className={styles.plate}>
      <Blobatar name={pathname} size={56} className={styles.plateBlob} alt="" />
      <div className={styles.plateMeta}>
        <span className={styles.plateCode}>404</span>
        <p className={styles.plateCaption}>
          No record for <code>{pathname}</code>
        </p>
      </div>
    </div>
  );
}
