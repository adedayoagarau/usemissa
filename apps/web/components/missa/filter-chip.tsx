"use client";

import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./filter-chip.module.css";

/**
 * A toggleable filter or preference choice. Selection is announced with
 * `aria-pressed` and shown with a check mark as well as the Forest outline,
 * so it never relies on colour alone. Never animates.
 */
export function FilterChip({
  selected,
  onSelectedChange,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "variant" | "size" | "onClick"> & {
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={selected}
      data-selected={selected || undefined}
      className={cn(styles.chip, className)}
      onClick={() => onSelectedChange(!selected)}
      {...props}
    >
      {selected ? <Check aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}
