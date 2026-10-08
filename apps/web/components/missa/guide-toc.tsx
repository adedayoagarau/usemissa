"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export interface GuideTocHeading {
  id: string;
  text: string;
}

/** Marks the section the reader is in, so the rail shows their place. */
function useActiveHeading(headings: GuideTocHeading[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          visible.set(entry.target.id, entry.isIntersecting);
        const firstVisible = targets.find((target) => visible.get(target.id));
        if (firstVisible) {
          setActive(firstVisible.id);
          return;
        }
        // Between headings: the last one above the viewport is current.
        const above = targets.filter(
          (target) => target.getBoundingClientRect().top < 0,
        );
        setActive(above.at(-1)?.id ?? null);
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [headings]);
  return active;
}

/** The Studio list anatomy with a ruled start edge, as docs navigation uses. */
function TocList({
  headings,
  active,
}: {
  headings: GuideTocHeading[];
  active: string | null;
}) {
  return (
    <ol className="flex flex-col border-s">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            aria-current={active === heading.id ? "location" : undefined}
            className="-ms-px block border-s-2 border-transparent py-1.5 ps-4 text-sm text-pretty text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=location]:border-primary aria-[current=location]:font-medium aria-[current=location]:text-foreground"
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** "On this page": a sticky rail on wide screens. */
export function GuideTocRail({ headings }: { headings: GuideTocHeading[] }) {
  const active = useActiveHeading(headings);
  return (
    <nav aria-labelledby="guide-toc-heading" className="flex flex-col gap-3">
      <p id="guide-toc-heading" className="text-sm font-semibold">
        On this page
      </p>
      <TocList headings={headings} active={active} />
    </nav>
  );
}

/** "On this page": a closed disclosure above the article on narrow screens. */
export function GuideTocDisclosure({
  headings,
  className,
}: {
  headings: GuideTocHeading[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <nav aria-label="On this page">
        <CollapsibleTrigger
          render={
            <Button variant="outline" className="w-full justify-between" />
          }
        >
          On this page
          <ChevronDown
            aria-hidden="true"
            className="transition-transform in-data-panel-open:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ps-1 pt-3" onClick={() => setOpen(false)}>
            <TocList headings={headings} active={null} />
          </div>
        </CollapsibleContent>
      </nav>
    </Collapsible>
  );
}
