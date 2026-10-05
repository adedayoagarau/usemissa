"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import styles from "@/app/discover/prizes/prizes.module.css";

/** Earlier winners of a prize, folded away until asked for. */
export function PrizeWinnersDisclosure({
  count,
  prizeName,
  children,
}: {
  count: number;
  prizeName: string;
  children: ReactNode;
}) {
  return (
    <Collapsible className={styles.disclosure}>
      <CollapsibleTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.disclosureTrigger}
          />
        }
      >
        Show {count} earlier {count === 1 ? "winner" : "winners"}
        <span className="sr-only"> of the {prizeName}</span>
        <ChevronDown aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
