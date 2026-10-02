import { RESPONSE_DECISION_STATUSES } from "@missa/radar-engine";

/** Submitted applications still waiting for an organization's decision. */
export const AWAITING_RESPONSE_STATUSES: readonly string[] = [
  "submitted",
  "received",
  "in-review",
  "longlisted",
  "shortlisted",
  "finalist",
  "waitlisted",
  "revision-requested",
  "partially-withdrawn",
];

export type ExpectedResponse = {
  expectedResponseBy: string;
  /** Where the window comes from; shown so an estimate is never mistaken for a promise. */
  expectedResponseBasis: "call-profile";
};

const day = 86_400_000;

export function isoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/**
 * The single expected-response estimate shared by Tracker and Calendar: the
 * submission date plus the call profile's stated response window. Omitted when
 * the application is not awaiting a decision or either input is missing, so
 * sparse data never becomes a generic guess.
 */
export function expectedResponse(
  status: string,
  submittedAt: Date | string | null | undefined,
  responseTimeDays: number | null | undefined,
): ExpectedResponse | undefined {
  if (!AWAITING_RESPONSE_STATUSES.includes(status)) return undefined;
  if (!submittedAt || !responseTimeDays || responseTimeDays <= 0) return undefined;
  const submitted = new Date(submittedAt).getTime();
  if (Number.isNaN(submitted)) return undefined;
  return {
    expectedResponseBy: new Date(submitted + responseTimeDays * day).toISOString().slice(0, 10),
    expectedResponseBasis: "call-profile",
  };
}

export const DECISION_STATUS_SQL = RESPONSE_DECISION_STATUSES.map((status) => `'${status}'`).join(",");
