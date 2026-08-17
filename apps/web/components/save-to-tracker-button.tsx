"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rememberFirstSaveReceipt } from "@/lib/firstSaveClient";
import type { FirstSaveReceipt } from "@/lib/firstSaveTypes";

export function SaveToTrackerButton({
  opportunityId,
  tracked = false,
  compact = false,
  signedIn = true,
  returnTo,
  opportunityTitle,
}: {
  opportunityId: string;
  tracked?: boolean;
  compact?: boolean;
  signedIn?: boolean;
  returnTo?: string;
  opportunityTitle?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const journeyId = useRef<string | undefined>(undefined);

  if (tracked) {
    return (
      <Button
        type="button"
        size={compact ? "icon" : "default"}
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
      size={compact ? "icon" : "default"}
      variant={compact ? "outline" : "default"}
      disabled={pending}
      aria-label={
        pending
          ? "Saving Opportunity"
          : opportunityTitle
            ? `Save ${opportunityTitle} privately`
            : "Save Opportunity privately"
      }
      onClick={() => {
        startTransition(async () => {
          try {
            if (!signedIn) {
              const response = await fetch("/api/journey/first-save/intent", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ opportunityId, returnTo }),
              });
              const body = (await response.json().catch(() => ({}))) as {
                authPath?: string;
                error?: string;
              };
              if (!response.ok || !body.authPath) {
                toast.error(
                  body.error ??
                    "We could not hold this Save request. Try again.",
                );
                return;
              }
              router.push(body.authPath);
              return;
            }

            const response = await fetch("/api/me/tracker", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                opportunityId,
                journeyId:
                  journeyId.current ??
                  (journeyId.current = window.crypto.randomUUID()),
              }),
            });
            const body = (await response.json().catch(() => ({}))) as {
              status?: string;
              receipt?: FirstSaveReceipt;
              error?: string;
            };
            if (!response.ok || !body.receipt) {
              toast.error(body.error ?? "We could not save this Opportunity.");
              return;
            }
            rememberFirstSaveReceipt(body.receipt);
            toast.success(
              body.status === "already-present"
                ? "Already in Tracker"
                : "Opportunity saved",
            );
            router.push("/tracker");
          } catch {
            toast.error(
              "We could not save this Opportunity. Your Tracker is unchanged. Try again.",
            );
          }
        });
      }}
    >
      <Bookmark aria-hidden="true" />
      {!compact ? (pending ? "Saving…" : "Save opportunity") : null}
    </Button>
  );
}
