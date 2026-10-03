"use client";

import type { RefObject } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ApplicationDetail } from "@/lib/application-workspace-types";
import type { TrackerHostedSubmission } from "@/components/tracker-product";
import {
  ApplicationRecord,
  type ApplicationRecordSection,
} from "./application-record";

/**
 * The application record as a side sheet over the Tracker list. Full width on
 * phones; 672px on larger screens. Focus returns to the element that opened it.
 */
export function ApplicationRecordSheet({
  opportunityId,
  hosted,
  works,
  section,
  onSectionChange,
  onChanged,
  onClose,
  returnFocus,
  emailEvidence,
}: {
  opportunityId: string | null;
  hosted?: TrackerHostedSubmission;
  works: Array<{ id: string; title: string }>;
  section: ApplicationRecordSection;
  onSectionChange: (section: ApplicationRecordSection) => void;
  onChanged: (detail: ApplicationDetail) => void;
  onClose: () => void;
  /** The control that opened the record; focus returns there on close. */
  returnFocus?: RefObject<HTMLElement | null>;
  emailEvidence?: boolean;
}) {
  return (
    <Sheet
      open={Boolean(opportunityId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        surface="canvas"
        className="gap-0 overflow-y-auto overscroll-contain p-0 [scrollbar-gutter:stable] data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        finalFocus={() => {
          const target = returnFocus?.current;
          return target && target.isConnected ? target : true;
        }}
      >
        <SheetTitle className="sr-only">Application record</SheetTitle>
        <SheetDescription className="sr-only">
          Stage, preparation, dates, materials, and history for one tracked
          application. Private to you.
        </SheetDescription>
        <div className="px-6 pt-14 pb-12 sm:px-8">
          {opportunityId ? (
            <ApplicationRecord
              key={opportunityId}
              opportunityId={opportunityId}
              hosted={hosted}
              works={works}
              initialSection={section}
              onSectionChange={onSectionChange}
              onChanged={onChanged}
              emailEvidence={emailEvidence}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
