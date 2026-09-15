"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FollowButton({
  userId,
  organizationId,
  organizationName,
  returnTo,
}: {
  userId?: string;
  organizationId: string;
  organizationName?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [followed, setFollowed] = useState(false);
  const requestKey = useRef<string | null>(null);

  if (followed)
    return (
      <Link
        href={`/following?organization=${encodeURIComponent(organizationId)}`}
        className="text-sm text-primary underline underline-offset-4"
      >
        Following
      </Link>
    );

  if (!userId) {
    const authPath = `/signup?next=${encodeURIComponent(returnTo ?? "/opportunities")}`;
    return (
      <Button
        nativeButton={false}
        render={<Link href={authPath} />}
        variant="link"
        aria-label={`Sign up to follow ${organizationName ?? "this organization"}`}
      >
        Sign up to follow
      </Button>
    );
  }

  return (
    <Button
      variant="link"
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          requestKey.current ??= crypto.randomUUID();
          try {
            const res = await fetch(`/api/users/${userId}/following`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "Idempotency-Key": requestKey.current,
              },
              body: JSON.stringify({ organizationId }),
            });
            if (res.ok) {
              setFollowed(true);
              toast.success(
                `Following ${organizationName ?? "this organization"}`,
              );
              router.refresh();
            } else {
              toast.error("Following could not be saved. Try again.");
            }
          } catch {
            toast.error("Following could not be saved. Try again.");
          }
        })
      }
    >
      {isPending ? "Saving…" : "Follow organization"}
    </Button>
  );
}
