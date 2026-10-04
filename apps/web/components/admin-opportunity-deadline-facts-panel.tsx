"use client";

import { useId, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeadlineFactsEditor } from "@/components/deadline-facts-editor";

/**
 * Platform-admin correction panel for an Opportunity's deadline, fee tiers and
 * stages. Corrections write a verified-correction change, so the public page
 * shows the date as changed with the previous value.
 */
export function AdminOpportunityDeadlineFactsPanel({ initialOpportunityId = "" }: { initialOpportunityId?: string }) {
  const inputId = useId();
  const [value, setValue] = useState(initialOpportunityId);
  const [opportunityId, setOpportunityId] = useState(initialOpportunityId.trim());

  return (
    <section className="grid gap-4 rounded-lg border border-border bg-card p-5" aria-labelledby={`${inputId}-title`}>
      <header className="grid gap-1">
        <h2 id={`${inputId}-title`} className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock aria-hidden="true" className="size-4" />
          Opportunity dates and fee tiers
        </h2>
        <p className="text-sm text-muted-foreground">
          Correct a deadline, close time, fee tiers or stages from the official source. A changed deadline is shown to creators with its previous date.
        </p>
      </header>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setOpportunityId(value.trim());
        }}
      >
        <div className="grid min-w-64 flex-1 gap-1.5">
          <Label htmlFor={inputId}>Opportunity ID</Label>
          <Input id={inputId} value={value} placeholder="opp_…" onChange={(event) => setValue(event.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={!value.trim()}>
          Open dates
        </Button>
      </form>
      {opportunityId ? (
        <DeadlineFactsEditor
          key={opportunityId}
          endpoint={`/api/admin/opportunities/${encodeURIComponent(opportunityId)}/deadline-facts`}
          canEdit
          showSourceUrl
          savedLabel="Correction saved."
        />
      ) : null}
    </section>
  );
}
