"use client";

import { useState } from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import styles from "./organization-mark.module.css";

/**
 * An organization's logo as a small contained mark. Logos never fill a card
 * cover: cropped with `object-fit: cover`, wordmarks lose letters and white
 * logos vanish on pale plates. The organization's name is always in the text
 * beside it, so the mark is decorative. If the logo fails to load, nothing
 * is shown.
 */
export function OrganizationMark({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Avatar
      className={className ? `${styles.mark} ${className}` : styles.mark}
      aria-hidden="true"
    >
      <AvatarImage
        src={src}
        alt=""
        loading="lazy"
        className={styles.logo}
        onLoadingStatusChange={(status) => {
          if (status === "error") setFailed(true);
        }}
      />
    </Avatar>
  );
}
