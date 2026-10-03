"use client";

import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { startByLabel, type StartBy } from "@/lib/start-by";

/**
 * "Start by 14 Oct" with its reasoning one click away. The trigger is a real
 * button; the date is an estimate and always says so. Ochre only when the
 * start-by day is today or has passed. Never animates.
 */
export function StartByDate({ startBy, title }: { startBy: StartBy; title: string }) {
  const attention = startBy.status !== "ahead";
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${startByLabel(startBy)}. Why this date for ${title}?`}
          />
        }
      >
        <span
          className={
            attention
              ? "inline-flex items-center gap-1.5 text-ochre-deep"
              : "inline-flex items-center gap-1.5 text-muted-foreground"
          }
        >
          <Hourglass aria-hidden="true" />
          <span className="font-mono tabular-nums">{startByLabel(startBy)}</span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Why this date</PopoverTitle>
          <PopoverDescription>
            An estimate of {startBy.daysNeeded} days, worked back from the
            deadline{startBy.basis === "default" ? " with a general allowance" : " from what is still to prepare"}.
          </PopoverDescription>
        </PopoverHeader>
        <ul className="space-y-2 text-sm">
          {startBy.reasons.map((reason, index) => (
            <li key={`${reason.label}-${index}`}>
              <p className="font-medium">{reason.label}</p>
              <p className="text-xs text-muted-foreground">{reason.detail}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Finish or link a step in Prepare and the date moves later.
        </p>
      </PopoverContent>
    </Popover>
  );
}
