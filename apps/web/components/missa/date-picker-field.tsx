"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * A date chosen from a calendar, in place of the browser's date input.
 * The value is an ISO calendar date (YYYY-MM-DD) so it round-trips with the
 * routes that store dates; the trigger reads like a field value.
 */
const toDate = (value?: string) => (value ? new Date(`${value.slice(0, 10)}T12:00:00`) : undefined);
const toIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const display = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(toDate(value));

export function DatePickerField({ id, value, onChange, placeholder = "Pick a date", disabled = false, clearable = true, ...labelling }: { id?: string; value?: string; onChange: (value: string | null) => void; placeholder?: string; disabled?: boolean; clearable?: boolean } & ({ "aria-label"?: string; "aria-labelledby"?: string })) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="field" id={id} disabled={disabled} {...labelling} />}>
        <CalendarDays aria-hidden="true" />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value ? display(value) : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent align="start" flush>
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={(date) => { if (date) { onChange(toIso(date)); setOpen(false); } }} />
        {clearable && value ? (
          <div className="flex justify-end border-t border-border px-2 py-2">
            <Button type="button" size="xs" variant="ghost" onClick={() => { onChange(null); setOpen(false); }}><X aria-hidden="true" />Clear date</Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
