import type { MyStatus, OpportunityType } from "@missa/radar-engine";

export type ApplicationSummary = {
  opportunityId: string;
  title: string;
  organizationName: string;
  type: OpportunityType;
  myStatus: MyStatus;
  opportunityStatus: string;
  available: boolean;
  revision: number;
  deadline: string | null;
  deadlineKind: string;
  /** Provider-stated closing instant, when the source gave one. */
  deadlineTime: string | null;
  /** Timezone the provider states the closing time in. */
  deadlineTimezone: string | null;
  submittedAt: string | null;
  updatedAt: string;
  workTitle: string | null;
  workId: string | null;
  notify: boolean;
  /** Applicable preparation checklist steps; 0 when no checklist exists yet. */
  preparationTotal?: number;
  /** Checklist steps marked complete or ready. */
  preparationDone?: number;
  /** Applicable checklist steps, used for Home's start-by estimates. */
  preparationItems?: PreparationItemSummary[];
};
export type PreparationItemSummary = {
  label: string;
  state: "missing" | "ready" | "complete";
  /** A Library Work, file, or saved answer is attached. */
  linked: boolean;
};
export type ApplicationDetail = ApplicationSummary & {
  notes: string;
  applyUrl: string | null;
  guidelinesUrl: string | null;
  history: { id: string; from: MyStatus | null; to: MyStatus; occurredOn: string | null; recordedAt: string; note: string | null; source: string; hasMaterials: boolean }[];
  materials: { id: string; createdAt: string; works: { id: string; title: string; description?: string }[]; answers: { id: string; label: string; answer: string }[]; files: { id: string; name: string }[] }[];
  goals: { id: string; title: string }[];
};
export const applicationView = (status: string): "saved" | "awaiting" | "history" =>
  ["saved", "interested", "preparing", "draft-started", "ready-to-submit"].includes(status) ? "saved" :
  ["accepted", "declined", "withdrawn", "delivered", "archived"].includes(status) ? "history" : "awaiting";

export function applicationDate(value: string | null): string {
  if (!value) return "Date not recorded";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

/** Calendar delivery state for one application, read by the Tracker record. */
export type ApplicationCalendarDelivery = {
  /** The private deadline feed (iCal subscription) is active. */
  feedActive: boolean;
  connections: { provider: "google" | "microsoft"; status: "active" | "reconnect-required"; lastSyncAt?: string }[];
  events: {
    id: string;
    title: string;
    startAt: string;
    allDay: boolean;
    syncStatus?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    /** The deadline this event was planned around has since changed. */
    deadlineChanged?: boolean;
  }[];
};
