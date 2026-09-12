"use client";

import Link from "next/link";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import styles from "./add-opportunity-to-calendar-button.module.css";

export function AddOpportunityToCalendarButton({
  item,
  className,
  showLabel = false,
  signedIn = false,
  tracked = false,
  returnTo,
}: {
  item: Pick<
    OpportunityBrowseProjection,
    "id" | "title" | "organizationName" | "deadline"
  >;
  className?: string;
  showLabel?: boolean;
  signedIn?: boolean;
  tracked?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const journeyId = useRef<string | undefined>(undefined);
  if (!item.deadline.date) return null;

  const label = `Add ${item.title} deadline to calendar`;
  const classNames = [
    styles.button,
    showLabel && styles.labelled,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!signedIn) {
    return (
      <Button
        nativeButton={false}
        render={
          <Link
            href={`/signup?next=${encodeURIComponent(returnTo ?? "/calendar")}`}
          />
        }
        variant="outline"
        className={classNames}
        aria-label={`Sign up to add ${item.title} deadline to calendar`}
        title="Sign up to add this deadline to your Missa Calendar"
        onClick={(event) => event.stopPropagation()}
      >
        <CalendarPlus aria-hidden="true" />
        {showLabel ? <span>Sign up to add deadline</span> : null}
      </Button>
    );
  }

  if (tracked) {
    return (
      <Button
        nativeButton={false}
        render={<Link href="/calendar?view=calendar" />}
        variant="outline"
        className={classNames}
        aria-label={label}
        title={label}
        onClick={(event) => event.stopPropagation()}
      >
        <CalendarPlus aria-hidden="true" />
        {showLabel ? <span>Open in calendar</span> : null}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={classNames}
      disabled={pending}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        startTransition(async () => {
          try {
            const response = await fetch("/api/me/tracker", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                opportunityId: item.id,
                journeyId:
                  journeyId.current ??
                  (journeyId.current = window.crypto.randomUUID()),
              }),
            });
            const body = (await response.json().catch(() => ({}))) as {
              calendar?: { status?: string };
              error?: string;
            };
            if (!response.ok) {
              toast.error(body.error ?? "We could not add this deadline.");
              return;
            }
            toast.success(
              body.calendar?.status === "pending"
                ? "Saved · Calendar update pending"
                : "Saved · Deadline added to Calendar",
            );
            router.push("/calendar?view=calendar");
          } catch {
            toast.error("We could not add this deadline. Try again.");
          }
        });
      }}
    >
      <CalendarPlus aria-hidden="true" />
      {showLabel ? <span>{pending ? "Adding…" : "Add to calendar"}</span> : null}
    </Button>
  );
}
