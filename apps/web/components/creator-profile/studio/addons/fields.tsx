"use client";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { DatePickerField } from "@/components/missa/date-picker-field";
import {
  COUNT_MAX,
  formatCount,
  hasPassed,
  parseCount,
  todayIso,
  webLinkIssue,
} from "@/lib/creator-profile-addon-fields";
import shared from "../profile-studio.module.css";
import styles from "./addons.module.css";

/**
 * Field building blocks for the add-on editors, drawn like the studio's
 * `TextField`: a visible label, the input, and one line that is either the
 * hint or, when something needs attention, the reason. That line is a polite
 * live region, so a change reaches screen readers without stealing focus.
 */

function Label({
  id,
  label,
  required,
  labelId,
}: {
  id: string;
  label: string;
  required?: boolean;
  labelId?: string;
}) {
  return (
    <label id={labelId} htmlFor={id}>
      {label}
      {!required && <span className={shared.optional}> · optional</span>}
    </label>
  );
}

/**
 * A whole number: an edition size, places left. An empty field means the
 * number is not stated; it is never NaN, negative or above the schema's limit.
 */
export function CountField({
  label,
  value,
  onChange,
  hint,
  cappedHint,
  max = COUNT_MAX,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  hint: string;
  /** Said instead of the hint right after a typed number was cut to `max`. */
  cappedHint?: string;
  /** The largest number this field takes. Never above the schema's limit. */
  max?: number;
  placeholder?: string;
}) {
  const id = useId();
  const [capped, setCapped] = useState(false);
  return (
    <div className={shared.field}>
      <Label id={id} label={label} />
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        className={styles.number}
        placeholder={placeholder}
        value={formatCount(value)}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const parsed = parseCount(event.target.value, max);
          setCapped(parsed.capped);
          onChange(parsed.value);
        }}
      />
      <p id={`${id}-hint`} className={shared.hint} aria-live="polite">
        {capped
          ? (cappedHint ?? `Capped at ${COUNT_MAX.toLocaleString("en-US")}.`)
          : hint}
      </p>
    </div>
  );
}

/** A four-digit year. Typing anything else is ignored; a short one is flagged. */
export function YearField({
  label = "Year",
  value,
  onChange,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const partial = value.length > 0 && value.length < 4;
  const error = partial && touched ? "Use four digits, like 2026." : undefined;
  return (
    <div className={shared.field}>
      <Label id={id} label={label} />
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        className={styles.number}
        placeholder={String(new Date().getFullYear())}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, 4))
        }
        onBlur={() => setTouched(true)}
      />
      <p
        id={`${id}-hint`}
        className={error ? styles.error : shared.hint}
        aria-live="polite"
      >
        {error ?? hint}
      </p>
    </div>
  );
}

/**
 * A date chosen from a calendar. Empty means no date. A date that has passed
 * says so, in words, with `passedNote`.
 */
export function DateField({
  label,
  value,
  onChange,
  hint,
  passedNote,
  today = todayIso(),
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  passedNote: string;
  today?: string;
}) {
  const id = useId();
  const passed = hasPassed(value, today);
  return (
    <div className={shared.field}>
      <Label id={id} labelId={`${id}-label`} label={label} />
      <DatePickerField
        id={id}
        aria-labelledby={`${id}-label ${id}`}
        value={value || undefined}
        placeholder="No date"
        onChange={(next) => onChange(next ?? "")}
      />
      <p
        className={passed ? styles.watch : shared.hint}
        aria-live="polite"
        aria-atomic="true"
      >
        {passed ? passedNote : hint}
      </p>
    </div>
  );
}

/**
 * A link to a page on the web. It has to be a full address, because publishing
 * rejects anything else. The reason shows once the field has been left, or at
 * once when a saved link is already unfinished.
 */
export function LinkField({
  label = "Link",
  value,
  onChange,
  hint,
  placeholder = "https://",
  required = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  const [touched, setTouched] = useState(() => Boolean(webLinkIssue(value)));
  const error = touched ? webLinkIssue(value) : undefined;
  return (
    <div className={shared.field}>
      <Label id={id} label={label} required={required} />
      <Input
        id={id}
        type="url"
        autoComplete="off"
        maxLength={2048}
        placeholder={placeholder}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTouched(true)}
      />
      <p
        id={`${id}-hint`}
        className={error ? styles.error : shared.hint}
        aria-live="polite"
      >
        {error ?? hint}
      </p>
    </div>
  );
}
