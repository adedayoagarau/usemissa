"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

/** Cursor history lives in the URL so reload, Back and shared links preserve navigation. */
export function OpportunityBrowsePagination({ nextCursor, className }: { nextCursor: string | null; className?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const cursor = params.get("cursor");
  const trail = params.getAll("trail");
  const link = (next: string | null, history: string[]) => {
    const query = new URLSearchParams(params.toString());
    query.delete("cursor");
    query.delete("trail");
    if (next) query.set("cursor", next);
    history.forEach((entry) => query.append("trail", entry));
    return `${pathname}?${query.toString()}#browse-results`;
  };
  if (!cursor && !nextCursor) return null;
  return (
    <Pagination className={className} aria-label="Opportunity pages">
      <PaginationContent>
        {cursor ? <>
          <PaginationItem><PaginationLink href={link(null, [])} size="default">First</PaginationLink></PaginationItem>
          <PaginationItem><PaginationPrevious className="[&_span]:inline" href={link(trail.at(-1) || null, trail.slice(0, -1))} /></PaginationItem>
        </> : null}
        <PaginationItem><span className="px-3 text-sm text-muted-foreground" aria-current="page">Page {cursor ? trail.length + 1 : 1}</span></PaginationItem>
        {nextCursor ? <PaginationItem><PaginationNext className="[&_span]:inline" href={link(nextCursor, [...trail, cursor ?? ""])} /></PaginationItem> : null}
      </PaginationContent>
    </Pagination>
  );
}
