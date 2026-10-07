import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariantClasses = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-100 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-control hover:bg-accent-deep active:bg-accent-deep dark:hover:bg-primary/90",
        outline:
          "border-border-strong bg-background text-foreground shadow-control hover:bg-row-hover aria-expanded:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-foreground/80 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 [&_svg:not([class*='text-'])]:text-muted-foreground hover:[&_svg:not([class*='text-'])]:text-foreground",
        destructive:
          "border-destructive/25 bg-background text-destructive shadow-control hover:bg-destructive-subtle focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        /** A control that opens a picker and shows its value, drawn like a text field. */
        field:
          "w-full justify-start border-border-strong bg-background font-normal text-foreground shadow-control hover:border-foreground/30 aria-expanded:border-ring aria-expanded:ring-3 aria-expanded:ring-ring/15 [&_svg:not([class*='text-'])]:text-muted-foreground",
        account:
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        accentOutline:
          "border-primary/30 bg-background text-primary shadow-control hover:bg-accent-tint",
        choice:
          "border-border bg-background text-left whitespace-normal hover:bg-muted data-[selected=true]:border-primary data-[selected=true]:bg-accent",
        shine:
          "relative overflow-hidden bg-primary text-primary-foreground hover:bg-accent-deep dark:hover:bg-primary/90 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%,transparent_100%)] before:bg-size-[250%_250%,100%_100%] before:bg-position-[200%_0,0_0] before:bg-no-repeat before:transition-[background-position] before:duration-1000 hover:before:bg-position-[-100%_0,0_0] dark:before:bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.2)_50%,transparent_75%,transparent_100%)]",
      },
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1 rounded-md px-2.5 text-[0.8125rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-md px-3 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-11",
        "icon-xs":
          "size-8 rounded-md in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-md in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11",
        account: "h-9 gap-2 px-3",
        choice: "h-auto min-h-24 w-full justify-start gap-4 p-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Button classes for elements that are not a `<Button>` (a `Link`, an `<a>`).
 * Merged with `cn()` so variant classes win over the base ones exactly as they
 * do on `<Button>`; without it the base `border-transparent` hid the outline
 * variant's border on links.
 */
function buttonVariants(
  props?: Parameters<typeof buttonVariantClasses>[0],
): string {
  return cn(buttonVariantClasses(props));
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariantClasses({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
