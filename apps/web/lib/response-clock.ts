/**
 * The response clock for a submitted application: how long the creator has
 * waited against what the organization states and what Missa creators have
 * observed. Duotrope and the Submission Grinder show the same idea; Missa keeps
 * the two sources apart and never invents a window when neither exists.
 *
 * Observed figures are used only with at least five reports and are always
 * labelled as observed by Missa creators, never as the organization's own.
 */
import { daysBetween } from "./deadline-moment";

export const MIN_OBSERVED_SAMPLE = 5;

export type ResponseClockInput = {
  /** YYYY-MM-DD the application was submitted. */
  submittedOn: string;
  /** Today in the creator's zone, YYYY-MM-DD. */
  today: string;
  /** Response window the organization states, in days. */
  statedDays?: number | null;
  /** Response times reported by Missa creators for this call. */
  observed?: { p50Days: number; p90Days: number; sampleSize: number } | null;
  /** The organization says it does not reply to every submission. */
  repliesNotGuaranteed?: boolean;
};

export type ResponseClockState =
  /** Still inside every known window. */
  | "waiting"
  /** Past what most creators saw; a polite query is reasonable. */
  | "time-to-query"
  /** Past the window the organization states. */
  | "past-stated"
  /** The organization does not promise a reply and the usual window has passed. */
  | "no-reply-expected"
  /** Waiting, with no window to compare against. */
  | "no-window";

export type ResponseClock = {
  state: ResponseClockState;
  waitedDays: number;
  statedDays?: number;
  typicalDays?: number;
  label: string;
  /** Where the comparison comes from, shown beside the label. */
  basis?: string;
};

export function responseClock(input: ResponseClockInput): ResponseClock {
  const waitedDays = Math.max(0, daysBetween(input.submittedOn, input.today) ?? 0);
  const stated = input.statedDays && input.statedDays > 0 ? input.statedDays : undefined;
  const observed = input.observed && input.observed.sampleSize >= MIN_OBSERVED_SAMPLE ? input.observed : undefined;
  const typical = observed?.p90Days;
  const waited = `Waiting ${waitedDays} ${waitedDays === 1 ? "day" : "days"}`;
  const observedBasis = observed ? `Observed from ${observed.sampleSize} Missa creators` : undefined;

  if (stated !== undefined && waitedDays > stated) {
    if (input.repliesNotGuaranteed) {
      return { state: "no-reply-expected", waitedDays, statedDays: stated, typicalDays: typical, label: `${waited} · replies are not guaranteed`, basis: "Stated by the organization" };
    }
    return { state: "past-stated", waitedDays, statedDays: stated, typicalDays: typical, label: `${waited} · past the stated ${stated} days`, basis: "Stated by the organization" };
  }
  if (typical !== undefined && waitedDays > typical) {
    if (input.repliesNotGuaranteed) {
      return { state: "no-reply-expected", waitedDays, statedDays: stated, typicalDays: typical, label: `${waited} · replies are not guaranteed`, basis: observedBasis };
    }
    return { state: "time-to-query", waitedDays, statedDays: stated, typicalDays: typical, label: `${waited} · time to follow up`, basis: observedBasis };
  }
  if (stated === undefined && typical === undefined) {
    return { state: "no-window", waitedDays, label: waited };
  }
  const window = stated ?? typical!;
  return {
    state: "waiting",
    waitedDays,
    statedDays: stated,
    typicalDays: typical,
    label: `${waited} of about ${window}`,
    basis: stated !== undefined ? "Stated by the organization" : observedBasis,
  };
}
