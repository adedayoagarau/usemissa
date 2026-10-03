"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * Presentational parts of CreatorOnboarding. State, persistence, and step
 * logic stay in creator-onboarding.tsx; these pieces only render.
 */

export type OnboardingStepMeta = {
  label: string;
  title: string;
  lede: string;
};

/** Step navigation. Visited steps are real buttons; later steps are text. */
export function OnboardingStepper({
  steps,
  current,
  furthest,
  completed,
  onSelect,
  disabled,
}: {
  steps: readonly OnboardingStepMeta[];
  current: number;
  furthest: number;
  completed: boolean;
  onSelect: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <nav aria-label="Setup steps" className="hidden md:block">
      <ol className="flex items-center gap-1">
        {steps.map((step, index) => {
          const active = index === current;
          const done = !active && (completed || index < furthest);
          const reachable = index <= furthest && !active;
          const marker = (
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors motion-reduce:transition-none",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-primary/40 bg-accent-tint text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {done && !active ? <Check className="size-3.5" /> : index + 1}
            </span>
          );
          const label = (
            <span
              className={cn(
                "text-sm",
                active
                  ? "font-semibold text-foreground"
                  : "hidden text-muted-foreground lg:inline",
              )}
            >
              {step.label}
            </span>
          );
          return (
            <li key={step.label} className="flex items-center gap-1">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="mx-1 h-px w-6 bg-border lg:w-8"
                />
              ) : null}
              {reachable ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(index)}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  {marker}
                  {label}
                  <span className="sr-only">
                    {active ? "" : step.label}
                    {done ? " (done)" : ""}
                  </span>
                </button>
              ) : (
                <span
                  className="flex min-h-11 items-center gap-2 px-2"
                  aria-current={active ? "step" : undefined}
                >
                  {marker}
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Compact mobile progress: four segments with a readable step label. */
export function OnboardingMobileProgress({
  steps,
  current,
}: {
  steps: readonly OnboardingStepMeta[];
  current: number;
}) {
  const complete = current >= steps.length;
  return (
    <div className="md:hidden">
      <div className="flex gap-1.5" aria-hidden="true">
        {steps.map((step, index) => (
          <span
            key={step.label}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors motion-reduce:transition-none",
              index <= current ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {complete
          ? "Setup complete"
          : `Step ${current + 1} of ${steps.length} · ${steps[current]!.label}`}
      </p>
    </div>
  );
}

/** Image-led multiple choice tile. The whole tile is the checkbox label. */
export function ChoiceTile({
  label,
  description,
  checked,
  onCheckedChange,
  media,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  media: ReactNode;
}) {
  const id = useId();
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
        checked
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-foreground/30",
      )}
    >
      <div
        aria-hidden="true"
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted"
      >
        {media}
        {checked ? <span className="absolute inset-0 bg-primary/10" /> : null}
      </div>
      <span className="flex flex-1 items-start justify-between gap-3 p-3 sm:p-4">
        <span className="min-w-0">
          <span
            id={`${id}-label`}
            className="block leading-snug font-medium text-foreground"
          >
            {label}
          </span>
          <span
            id={`${id}-description`}
            className="mt-1 block text-xs leading-relaxed text-muted-foreground"
          >
            {description}
          </span>
        </span>
        <Checkbox
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-description`}
          checked={checked}
          onCheckedChange={(next) => onCheckedChange(next === true)}
        />
      </span>
    </label>
  );
}

/** Row-shaped multiple choice with a square thumbnail. */
export function ChoiceRow({
  label,
  description,
  checked,
  onCheckedChange,
  imageSrc,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  imageSrc: string;
}) {
  const id = useId();
  return (
    <label
      className={cn(
        "flex min-h-24 cursor-pointer items-center gap-4 rounded-xl border bg-card p-3 pe-4 transition-[border-color,box-shadow] duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
        checked
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-foreground/30",
      )}
    >
      <span
        aria-hidden="true"
        className="relative size-18 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="72px"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          id={`${id}-label`}
          className="block leading-snug font-medium text-foreground"
        >
          {label}
        </span>
        <span
          id={`${id}-description`}
          className="mt-1 block text-xs leading-relaxed text-muted-foreground"
        >
          {description}
        </span>
      </span>
      <Checkbox
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
    </label>
  );
}

/** Selectable refinement chip with checkbox semantics and a 44px target. */
export function ChoiceChip({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
        checked
          ? "border-primary bg-accent-tint text-foreground"
          : "border-border bg-background hover:border-foreground/30",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      {label}
    </label>
  );
}

/** Single choice card used inside a RadioGroup. */
export function RadioCard({
  value,
  label,
  description,
  checked,
}: {
  value: string;
  label: string;
  description?: string;
  checked: boolean;
}) {
  const id = useId();
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
        checked
          ? "border-primary bg-accent-tint"
          : "border-border bg-background hover:border-foreground/30",
      )}
    >
      <span className="mt-0.5">
        <RadioGroupItem
          value={value}
          aria-labelledby={`${id}-label`}
          aria-describedby={description ? `${id}-description` : undefined}
        />
      </span>
      <span className="min-w-0">
        <span id={`${id}-label`} className="block font-medium text-foreground">
          {label}
        </span>
        {description ? (
          <span
            id={`${id}-description`}
            className="mt-0.5 block text-xs leading-relaxed text-muted-foreground"
          >
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Live, private summary of the choices made so far. */
export function OnboardingSummaryCard({
  rows,
}: {
  rows: { label: string; value: string | null }[];
}) {
  return (
    <section
      aria-label="Your choices so far"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          What Missa will look for
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" />
          Private
        </span>
      </div>
      <dl className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-t border-border pt-3 text-sm"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "min-w-0 break-words",
                row.value ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.value ?? "Not chosen yet"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Preview of the public Profile identity; nothing here is published. */
export function ProfilePreviewCard({
  name,
  address,
  practices,
}: {
  name: string;
  address: string | null;
  practices: string[];
}) {
  const initials =
    name
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?";
  return (
    <section
      aria-label="Profile preview"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          Profile preview
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" />
          Not published
        </span>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-tint font-heading text-xl text-primary"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-2xl leading-tight text-foreground">
            {name || "Your name"}
          </p>
          <p
            className={cn(
              "mt-1 truncate text-sm text-muted-foreground",
              address && "font-mono",
            )}
          >
            {address ?? "Address chosen later"}
          </p>
        </div>
      </div>
      {practices.length ? (
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
          {practices.join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
