"use client";

import { useState } from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import styles from "./social-auth-button.module.css";

export function SocialAuthButton({
  disabled = false,
  onGoogle,
}: {
  disabled?: boolean;
  onGoogle: () => Promise<void>;
}) {
  const [isPending, setIsPending] = useState(false);

  async function startGoogle() {
    setIsPending(true);
    try {
      await onGoogle();
    } catch {
      setIsPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={styles.button}
      disabled={disabled || isPending}
      onClick={() => void startGoogle()}
    >
      {isPending ? (
        <LoaderCircle className={`${styles.spinner} size-4 animate-spin`} aria-hidden="true" />
      ) : (
        <Image
          className={styles.mark}
          src="/brand/google-g.svg"
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
        />
      )}
      {isPending ? "Connecting to Google…" : "Continue with Google"}
    </Button>
  );
}
