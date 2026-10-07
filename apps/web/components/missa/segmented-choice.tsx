"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/**
 * One visible choice from a short, ordered set, drawn as joined segments:
 * a 0 to 5 score, or Accept / Waitlist / Decline. It is a radio group, so
 * arrow keys move between options and screen readers announce "n of m".
 * More than six options (a 0 to 10 score) use the "scale" layout, which
 * wraps to two rows of full-size targets on a phone.
 */
export interface SegmentedChoiceOption {
  value: string;
  label: string;
  /** Longer name for assistive technology when the label is a bare number. */
  accessibleLabel?: string;
}

const SCALE_AFTER = 6;

export function SegmentedChoice({
  options,
  value,
  onValueChange,
  disabled = false,
  invalid = false,
  fit = "fill",
  ...labelling
}: {
  options: SegmentedChoiceOption[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** "fill" spreads segments across the row; "content" sizes the control to its labels. */
  fit?: "fill" | "content";
} & ({ "aria-label": string } | { "aria-labelledby": string })) {
  return (
    <RadioGroup
      {...labelling}
      variant={options.length > SCALE_AFTER ? "scale" : "segmented"}
      value={value ?? ""}
      onValueChange={(next) => onValueChange(String(next))}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={fit === "content" ? "w-fit" : undefined}
    >
      {options.map((option) => (
        <RadioGroupItem key={option.value} variant={options.length > SCALE_AFTER ? "scale" : "segmented"} value={option.value} aria-label={option.accessibleLabel}>
          {option.label}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}
