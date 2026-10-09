import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "h-11 w-full min-w-0 px-3 py-1 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground rounded-md border border-border-strong bg-background shadow-control transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "text-base md:text-sm",
        compact: "h-9 text-sm",
        large: "text-lg",
        /** A document's own title, set in the page like a heading: no box, centred, underlined on focus. */
        document:
          "h-auto max-w-2xl border-0 bg-transparent px-0 text-center text-3xl text-foreground shadow-none hover:border-0 focus-visible:underline focus-visible:decoration-primary focus-visible:underline-offset-8 focus-visible:ring-0 dark:bg-transparent",
      },
    },
    defaultVariants: { size: "default" },
  },
);

function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
