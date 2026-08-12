"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SaveToTrackerButton({
  opportunityId,
  tracked = false,
  compact = false,
}: {
  opportunityId: string;
  tracked?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (tracked) {
    return (
      <Button
        type="button"
        size={compact ? "icon-sm" : "default"}
        variant="secondary"
        disabled
        aria-label="Saved to Tracker"
      >
        <Check aria-hidden="true" />
        {!compact ? "In Tracker" : null}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={compact ? "icon-sm" : "default"}
      variant={compact ? "outline" : "default"}
      disabled={pending}
      aria-label={pending ? "Saving to Tracker" : "Save to Tracker"}
      onClick={() => {
        startTransition(async () => {
          const response = await fetch("/api/me/tracker", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ opportunityId }),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            toast.error(body.error ?? "Could not save this opportunity");
            return;
          }
          const body = (await response.json()) as { status?: string };
          toast.success(
            body.status === "already-present"
              ? "Already in Tracker"
              : "Saved to Tracker",
          );
          router.refresh();
        });
      }}
    >
      <Bookmark aria-hidden="true" />
      {!compact ? (pending ? "Saving…" : "Save to Tracker") : null}
    </Button>
  );
}
