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
  submittedAt: string | null;
  updatedAt: string;
  workTitle: string | null;
  workId: string | null;
  notify: boolean;
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
