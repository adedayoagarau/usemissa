"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

/**
 * A collapsible section of a grouped `Table variant="grid"` list: a bold
 * header row with a count, then its rows. Sections are how a working list
 * says what needs doing first (Past due, Waiting for approval, Waiting).
 */
export function ListGroup({ title, count, columns, defaultOpen = true, children }: { title: string; count: number; columns: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <TableBody>
      <TableRow variant="static">
        <TableCell colSpan={columns} className="px-1 pt-4 pb-1.5">
          <Button type="button" variant="disclosure" size="sm" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
            {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
            {title}
            <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">{count}</span>
          </Button>
        </TableCell>
      </TableRow>
      {open ? children : null}
    </TableBody>
  );
}
