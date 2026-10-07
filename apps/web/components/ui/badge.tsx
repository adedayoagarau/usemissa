import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Time-sensitive state; product code reaches it only through UrgencyBadge.
        warning: "border-warning bg-warning-subtle text-ochre-deep",
        // Neutral information (check-ins, opens soon); reached through Missa wrappers.
        information: "bg-mineral-blue-tint text-mineral-blue",
        // Genuinely positive state (on track, accepted, free to submit).
        success: "bg-lichen-tint text-green",
        // Quiet Forest for open, start-by, and ready states.
        accent: "bg-accent-tint text-accent-deep",
        // Categorical labels (DESIGN.md §3); reached only through Missa wrappers.
        "hue-red": "bg-hue-red-subtle text-hue-red-ink",
        "hue-orange": "bg-hue-orange-subtle text-hue-orange-ink",
        "hue-amber": "bg-hue-amber-subtle text-hue-amber-ink",
        "hue-yellow": "bg-hue-yellow-subtle text-hue-yellow-ink",
        "hue-lime": "bg-hue-lime-subtle text-hue-lime-ink",
        "hue-green": "bg-hue-green-subtle text-hue-green-ink",
        "hue-teal": "bg-hue-teal-subtle text-hue-teal-ink",
        "hue-blue": "bg-hue-blue-subtle text-hue-blue-ink",
        "hue-indigo": "bg-hue-indigo-subtle text-hue-indigo-ink",
        "hue-purple": "bg-hue-purple-subtle text-hue-purple-ink",
        "hue-magenta": "bg-hue-magenta-subtle text-hue-magenta-ink",
        "hue-pink": "bg-hue-pink-subtle text-hue-pink-ink",

      },
      size: {
        default: "h-5 px-2 py-0.5 text-xs",
        compact: "h-5 px-2 py-0.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  });
}

export { Badge, badgeVariants };
