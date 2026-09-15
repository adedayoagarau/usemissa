"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const collapsibleVariants = cva("", {
  variants: {
    variant: {
      default: "",
      section: "border-t border-border pt-3",
      sectionSpacious: "border-t border-border pt-4",
      divided: "border-b border-border py-2",
    },
  },
  defaultVariants: { variant: "default" },
});

function Collapsible({
  className,
  variant = "default",
  ...props
}: CollapsiblePrimitive.Root.Props & VariantProps<typeof collapsibleVariants>) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn(collapsibleVariants({ variant }), className)}
      {...props}
    />
  );
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  );
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  );
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  collapsibleVariants,
};
