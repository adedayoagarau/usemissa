"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import { useCallback, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import cx from "./work-media.module.css";

export type ImageStatus = "loading" | "loaded" | "error";

type Result = { src: string; attempt: number; status: ImageStatus };

/**
 * Where an image is: still arriving, here, or failed. `retry` asks the browser
 * for it again. Spread `imageProps` on the `<img>` and give it `key={attempt}`.
 * An image that finished before the page came alive is noticed too.
 */
export function useImageStatus(src: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result>({
    src,
    attempt: 0,
    status: "loading",
  });
  const status: ImageStatus =
    result.src === src && result.attempt === attempt
      ? result.status
      : "loading";
  const settle = useCallback(
    (next: ImageStatus) =>
      setResult((current) =>
        current.src === src &&
        current.attempt === attempt &&
        current.status === next
          ? current
          : { src, attempt, status: next },
      ),
    [src, attempt],
  );
  const imageProps: Pick<
    ImgHTMLAttributes<HTMLImageElement>,
    "onLoad" | "onError"
  > & { ref: (image: HTMLImageElement | null) => void } = {
    ref: (image) => {
      if (image?.complete && image.currentSrc)
        settle(image.naturalWidth > 0 ? "loaded" : "error");
    },
    onLoad: () => settle("loaded"),
    onError: () => settle("error"),
  };
  return {
    status,
    attempt,
    retry: () => setAttempt((current) => current + 1),
    imageProps,
  };
}

/**
 * Feedback for a picture that could not be fetched. The work is still there,
 * so say that, and offer one way to try again.
 */
export function MediaError({
  title,
  onRetry,
  className,
}: {
  /** Names the work in the button, so many cards on a page stay distinct. */
  title: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <Empty variant="bordered" className={cn(cx.mediaError, className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImageOff aria-hidden="true" />
        </EmptyMedia>
        <EmptyDescription>
          The image didn’t load. The work is still here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="link" onClick={onRetry}>
          Try again
          <span className="sr-only"> ({title})</span>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** A picture with a placeholder while it loads and a way back if it fails. */
export function MediaImage({
  src,
  alt,
  title,
  className,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  /** The work it belongs to, for the retry button. */
  title: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const image = useImageStatus(src);
  if (image.status === "error")
    return <MediaError title={title} onRetry={image.retry} />;
  return (
    <span className={cx.cardImage} data-loading={image.status === "loading"}>
      {image.status === "loading" && <Skeleton className={cx.skeleton} />}
      <img
        key={image.attempt}
        {...image.imageProps}
        src={src}
        alt={alt}
        loading={loading}
        className={className}
      />
    </span>
  );
}
