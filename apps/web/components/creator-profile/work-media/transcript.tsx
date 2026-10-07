"use client";
import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import cx from "./work-media.module.css";

/**
 * The words of a film or recording, opened on request. Line breaks are kept.
 * Nothing renders when the creator wrote none.
 */
export function Transcript({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(cx.transcript, className)}
    >
      <CollapsibleTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <FileText aria-hidden="true" />
        {open ? "Hide the transcript" : "Read the transcript"}
        <ChevronDown aria-hidden="true" className={cx.chevron} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cx.transcriptText}>{text.trim()}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
