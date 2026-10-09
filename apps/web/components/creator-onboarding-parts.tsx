"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { cleanTitleOrLabel } from "@/lib/textUtils";
import type {
  OnboardingMatch,
  OnboardingMatches,
} from "@/lib/onboardingMatches";
import { Button } from "@/components/ui/button";

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
                <Button variant="outline" size="sm"
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(index)}
                >
                  {marker}
                  {label}
                  <span className="sr-only">
                    {active ? "" : step.label}
                    {done ? " (done)" : ""}
                  </span>
                </Button>
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
        <span
          className={cn(
            "absolute top-3 right-3 flex size-7 items-center justify-center rounded-full border transition-[background-color,border-color,opacity] duration-150 motion-reduce:transition-none",
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-background/80 bg-background/70 text-transparent opacity-0 group-hover:opacity-100",
          )}
        >
          <Check className="size-4" />
        </span>
      </div>
      <span className="flex flex-1 items-start justify-between gap-3 p-3 sm:p-4">
        <span className="min-w-0">
          <span
            id={`${id}-label`}
            className="block text-base leading-snug font-medium text-foreground"
          >
            {label}
          </span>
          <span
            id={`${id}-description`}
            className="mt-0.5 block truncate text-xs text-muted-foreground"
          >
            {description}
          </span>
        </span>
        <span className="mt-0.5">
          <Checkbox
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-description`}
            checked={checked}
            onCheckedChange={(next) => onCheckedChange(next === true)}
          />
        </span>
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
  compact = false,
}: {
  value: string;
  label: string;
  description?: string;
  checked: boolean;
  /** Inline chip without a description, for short single-choice lists. */
  compact?: boolean;
}) {
  const id = useId();
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer gap-3 rounded-lg border text-sm transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-reduce:transition-none",
        compact ? "items-center px-3.5 py-2" : "items-start px-3 py-3",
        checked
          ? "border-primary bg-accent-tint"
          : "border-border bg-background hover:border-foreground/30",
      )}
    >
      <span className={compact ? "flex" : "mt-0.5"}>
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

/** Live count of open calls matching the choices so far. */
export function MatchCount({
  matches,
  hasChoices,
}: {
  matches: OnboardingMatches;
  hasChoices: boolean;
}) {
  if (matches.state === "unavailable") return <span />;
  const total = matches.total;
  return (
    <p
      role="status"
      aria-live="polite"
      className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none",
          matches.state === "loading" ? "bg-border" : "bg-primary",
        )}
      />
      {total === undefined ? (
        <span>Counting open calls…</span>
      ) : (
        <span className="truncate">
          <strong
            key={total}
            className="animate-in font-semibold text-foreground tabular-nums duration-200 fade-in-0 motion-reduce:animate-none"
          >
            {total.toLocaleString("en-US")}
          </strong>{" "}
          <span className="hidden sm:inline">
            {hasChoices
              ? total === 1
                ? "open call matches so far"
                : "open calls match so far"
              : "open calls on Missa"}
          </span>
          <span className="sm:hidden">
            {hasChoices ? (total === 1 ? "match" : "matches") : "open calls"}
          </span>
        </span>
      )}
    </p>
  );
}

function deadlineLabel(deadline: OnboardingMatch["deadline"]) {
  if (!deadline.date) {
    return deadline.kind === "rolling" ? "Rolling" : "Date to confirm";
  }
  const date = new Date(`${deadline.date}T12:00:00`);
  return `Closes ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)}`;
}

/** The first few open calls that match, linking to their detail pages. */
export function MatchList({ items }: { items: OnboardingMatch[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/opportunities/${encodeURIComponent(item.slug)}`}
            className="group flex items-start justify-between gap-4 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0">
              <span className="line-clamp-2 font-heading text-lg leading-snug text-foreground group-hover:text-primary">
                {cleanTitleOrLabel(item.title)}
              </span>
              {item.organizationName ? (
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  {cleanTitleOrLabel(item.organizationName)}
                </span>
              ) : null}
            </span>
            <span className="mt-1 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {deadlineLabel(item.deadline)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
