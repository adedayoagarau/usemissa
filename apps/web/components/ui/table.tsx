"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Table({
  className,
  scrollLabel,
  variant = "default",
  ...props
}: React.ComponentProps<"table"> & {
  /** Names the horizontal scroll container and puts it in the tab order, so keyboard users can scroll a table wider than its column. */
  scrollLabel?: string;
  /** "grid" draws hairline column dividers, as task lists do, for dense multi-column records. */
  variant?: "default" | "grid";
}) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      {...(scrollLabel
        ? { role: "region", "aria-label": scrollLabel, tabIndex: 0 }
        : {})}
    >
      <table
        data-slot="table"
        data-variant={variant}
        className={cn("w-full caption-bottom text-sm data-[variant=grid]:border-y data-[variant=grid]:border-border data-[variant=grid]:[&_td:not(:last-child)]:border-e data-[variant=grid]:[&_th:not(:last-child)]:border-e data-[variant=grid]:[&_td]:border-border data-[variant=grid]:[&_th]:border-border", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

const tableRowVariants = cva(
  "border-b border-border transition-colors has-aria-expanded:bg-row-hover data-[state=selected]:bg-row-selected",
  {
    variants: {
      variant: { default: "hover:bg-row-hover", static: "hover:bg-transparent" },
    },
    defaultVariants: { variant: "default" },
  },
);

function TableRow({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"tr"> & VariantProps<typeof tableRowVariants>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(tableRowVariants({ variant }), className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-3 text-start align-middle text-xs font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pe-0",
        className,
      )}
      {...props}
    />
  );
}

const tableCellVariants = cva(
  "px-3 py-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0",
  {
    variants: { tone: { default: "", muted: "text-muted-foreground" } },
    defaultVariants: { tone: "default" },
  },
);

function TableCell({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"td"> & VariantProps<typeof tableCellVariants>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(tableCellVariants({ tone }), className)}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  tableRowVariants,
  tableCellVariants,
};
