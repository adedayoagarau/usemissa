"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

/**
 * "segmented" draws the group as one joined control, each option a labelled
 * segment: for short ordered scales such as a 0 to 5 score. Arrow keys still
 * move between options. "scale" is the same control for a long scale such as
 * 0 to 10: on a phone it breaks into two rows of separate 44px targets, and
 * from the small breakpoint up it joins into one row.
 */
type RadioGroupVariant = "default" | "segmented" | "scale";

const segmentItem =
  "relative flex min-w-0 items-center justify-center border-input px-2 text-sm font-medium whitespace-nowrap text-foreground tabular-nums outline-none transition-colors not-data-checked:hover:bg-muted focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary data-checked:text-primary-foreground motion-reduce:transition-none";

function RadioGroup({ className, variant = "default", ...props }: RadioGroupPrimitive.Props & { variant?: RadioGroupVariant }) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      data-variant={variant}
      className={cn(
        variant === "segmented"
          ? "flex w-full flex-nowrap overflow-hidden rounded-lg border border-input bg-background aria-invalid:border-destructive"
          : variant === "scale"
            ? "group/scale grid w-full grid-cols-6 gap-1.5 sm:flex sm:flex-nowrap sm:gap-0 sm:overflow-hidden sm:rounded-lg sm:border sm:border-input sm:bg-background sm:aria-invalid:border-destructive"
            : "grid w-full gap-2",
        className,
      )}
      {...props}
    />
  );
}

function RadioGroupItem({ className, variant = "default", children, ...props }: RadioPrimitive.Root.Props & { variant?: RadioGroupVariant }) {
  if (variant === "segmented" || variant === "scale") {
    return (
      <RadioPrimitive.Root
        data-slot="radio-group-item"
        data-variant={variant}
        className={cn(
          segmentItem,
          variant === "segmented"
            ? "h-9 flex-1 border-e last:border-e-0"
            : "h-11 rounded-md border bg-background group-aria-invalid/scale:border-destructive sm:h-9 sm:flex-1 sm:rounded-none sm:border-0 sm:border-e sm:last:border-e-0",
          className,
        )}
        {...props}
      >
        {children}
      </RadioPrimitive.Root>
    );
  }
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
