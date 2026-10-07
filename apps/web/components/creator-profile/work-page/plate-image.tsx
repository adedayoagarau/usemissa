"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * One picture on a work page. When it can't load it says so, keeps the rest of
 * the page where it is and offers Try again, instead of leaving a broken frame.
 */
export function PlateImage({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  /** The lead picture loads straight away; the rest wait until they are near. */
  eager?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  // An image can fail before the page has hydrated, so the error event is missed.
  const check = (image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  };
  if (failed)
    return (
      <Alert>
        <AlertDescription>
          The image didn’t load. The work is still here.
        </AlertDescription>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-fit"
          onClick={() => {
            setFailed(false);
            setAttempt((count) => count + 1);
          }}
        >
          Try again
        </Button>
      </Alert>
    );
  return (
    <img
      key={attempt}
      ref={check}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
