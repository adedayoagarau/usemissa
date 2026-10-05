"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import styles from "./match-explanation-trigger.module.css";

/**
 * A fit score that always carries its explanation. The score is a real
 * button opening a popover with the reasons and watchouts behind it. When
 * there is no evidence to score, `score` is null and the trigger says so
 * instead of showing a number.
 */
export function MatchExplanationTrigger({
  score,
  subject,
  reasons,
  watchouts = [],
  note,
  emptyLabel = "Limited data",
}: {
  score: number | null;
  /** Names what was scored, for the accessible label and popover title. */
  subject: string;
  reasons: string[];
  watchouts?: string[];
  note: string;
  /** What the trigger reads when there is no score. */
  emptyLabel?: string;
}) {
  const scored = score !== null;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={styles.trigger}
            data-scored={scored || undefined}
            aria-label={
              scored
                ? `${score}% fit for ${subject}. Show why`
                : `Not enough recorded detail to score ${subject}. Show why`
            }
          />
        }
      >
        {scored ? (
          <>
            <span className={`${styles.score} font-mono`}>{score}%</span> fit
          </>
        ) : (
          emptyLabel
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className={styles.popover}>
        <PopoverHeader>
          <PopoverTitle>
            {scored ? `Why ${score}% fit` : "Why there is no score"}
          </PopoverTitle>
          <PopoverDescription>{note}</PopoverDescription>
        </PopoverHeader>
        {reasons.length ? (
          <ul className={styles.list} aria-label="Reasons">
            {reasons.map((reason) => (
              <li key={reason}>
                <CheckCircle2 aria-hidden="true" data-tone="reason" />
                {reason}
              </li>
            ))}
          </ul>
        ) : null}
        {watchouts.length ? (
          <ul className={styles.list} aria-label="Watchouts">
            {watchouts.map((watchout) => (
              <li key={watchout}>
                <TriangleAlert aria-hidden="true" data-tone="watchout" />
                {watchout}
              </li>
            ))}
          </ul>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
