import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Toggleable filter chip. Selecting a filter is a peer toggle, not navigation,
 * so state is carried by aria-pressed and data-selected rather than
 * aria-current. The selected state uses the Forest action fill; unselected uses
 * a quiet outline. The chip adds no motion of its own (DESIGN.md §9).
 */
export function FilterChip({
  selected,
  onToggle,
  children,
  className,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      aria-pressed={selected}
      data-selected={selected}
      className={className}
      onClick={onToggle}
    >
      {children}
    </Button>
  );
}
