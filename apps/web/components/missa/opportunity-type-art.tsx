import type { ReactNode } from "react";
import type { OpportunityType } from "@missa/contracts";
import { cn } from "@/lib/utils";

/**
 * Stand-in art for an opportunity without a cleared photo. Each kind of
 * opportunity draws one simple line illustration on its own categorical hue,
 * so a residency always looks like a residency. It is drawn, never a photo,
 * so nobody mistakes it for the opportunity's own image.
 */
type ArtGroup = "funding" | "recognition" | "residency" | "publishing" | "showing" | "gathering" | "work" | "other";

const GROUP_BY_TYPE: Record<OpportunityType, ArtGroup> = {
  grant: "funding",
  scholarship: "funding",
  fellowship: "funding",
  award: "recognition",
  contest: "recognition",
  residency: "residency",
  "open-call": "publishing",
  magazine: "publishing",
  pitch: "publishing",
  exhibition: "showing",
  commission: "showing",
  festival: "gathering",
  conference: "gathering",
  job: "work",
  rfp: "work",
  other: "other",
};

// Static class strings so Tailwind keeps them; the hue identifies the kind, never a status.
const HUE_CLASSES: Record<ArtGroup, string> = {
  funding: "bg-hue-teal-subtle text-hue-teal-ink",
  recognition: "bg-hue-amber-subtle text-hue-amber-ink",
  residency: "bg-hue-green-subtle text-hue-green-ink",
  publishing: "bg-hue-indigo-subtle text-hue-indigo-ink",
  showing: "bg-hue-red-subtle text-hue-red-ink",
  gathering: "bg-hue-magenta-subtle text-hue-magenta-ink",
  work: "bg-hue-blue-subtle text-hue-blue-ink",
  other: "bg-hue-orange-subtle text-hue-orange-ink",
};

// Drawn on a 120 × 120 grid with currentColor strokes; the viewBox crops the empty margin.
const MOTIFS: Record<ArtGroup, ReactNode> = {
  funding: (
    <>
      <ellipse cx="60" cy="86" rx="26" ry="8" />
      <path d="M34 86v-10c0 4.4 11.6 8 26 8s26-3.6 26-8v10" />
      <path d="M34 76v-10c0 4.4 11.6 8 26 8s26-3.6 26-8v10" />
      <ellipse cx="60" cy="66" rx="26" ry="8" />
      <path d="M60 58V34" />
      <path d="M60 44c0-8 6-13 14-13 0 8-6 13-14 13Z" />
      <path d="M60 50c0-7-5-11-12-11 0 7 5 11 12 11Z" />
    </>
  ),
  recognition: (
    <>
      <path d="M48 66 40 96l12-6 8 10 4-30" />
      <path d="M72 66l8 30-12-6-8 10" />
      <circle cx="60" cy="50" r="22" />
      <path d="m60 37 4 9 9.5 1-7 6.5 2 9.5-8.5-5-8.5 5 2-9.5-7-6.5 9.5-1Z" />
    </>
  ),
  residency: (
    <>
      <path d="M28 58 60 32l32 26" />
      <path d="M36 52v40h48V52" />
      <path d="M53 92V72h14v20" />
      <rect x="42" y="58" width="10" height="10" />
      <rect x="68" y="58" width="10" height="10" />
      <path d="M24 92h72" />
    </>
  ),
  publishing: (
    <>
      <path d="M60 40c-8-6-20-8-32-6v52c12-2 24 0 32 6" />
      <path d="M60 40c8-6 20-8 32-6v52c-12-2-24 0-32 6" />
      <path d="M60 40v52" />
      <path d="M36 48c6-1 12 0 17 2M36 58c6-1 12 0 17 2M36 68c6-1 12 0 17 2" />
      <path d="M67 50c5-2 11-3 17-2M67 60c5-2 11-3 17-2" />
    </>
  ),
  showing: (
    <>
      <rect x="30" y="30" width="60" height="60" />
      <rect x="38" y="38" width="44" height="44" />
      <path d="m38 74 13-14 10 10 7-7 14 14" />
      <circle cx="70" cy="50" r="4" />
      <path d="M60 22v8" />
    </>
  ),
  gathering: (
    <>
      <path d="M24 90 60 30l36 60" />
      <path d="M60 30v-8l10 4-10 4" />
      <path d="M50 90c0-12 4-20 10-26 6 6 10 14 10 26" />
      <path d="M18 90h84" />
      <path d="M36 72c-4 0-8 2-10 6M84 72c4 0 8 2 10 6" />
    </>
  ),
  work: (
    <>
      <path d="M40 26h30l14 14v54H40Z" />
      <path d="M70 26v14h14" />
      <path d="M48 52h28M48 62h28M48 72h18" />
      <path d="m58 84 5 5 9-10" />
    </>
  ),
  other: (
    <>
      <circle cx="60" cy="60" r="30" />
      <path d="m70 50-6 14-14 6 6-14Z" />
      <path d="M60 26v6M60 88v6M26 60h6M88 60h6" />
    </>
  ),
};

export function opportunityArtGroup(type: OpportunityType | string): ArtGroup {
  return GROUP_BY_TYPE[type as OpportunityType] ?? "other";
}

export function OpportunityTypeArt({ type, className }: { type: OpportunityType | string; className?: string }) {
  const group = opportunityArtGroup(type);
  return (
    <div
      aria-hidden="true"
      data-art-group={group}
      className={cn("flex h-full w-full items-center justify-center overflow-hidden", HUE_CLASSES[group], className)}
    >
      <svg
        viewBox="14 14 92 92"
        className="h-3/4 max-h-40 w-3/4 max-w-40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {MOTIFS[group]}
      </svg>
    </div>
  );
}
