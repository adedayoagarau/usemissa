import type { OpeningPrediction, Opportunity, OpportunityCycle } from '../domain/types.js';
import { addDays, isoDateOf } from '../extraction/dates.js';

function dayOfYear(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z');
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}

/** Circular mean/spread over day-of-year so December↔January cycles average correctly. */
function circularStats(days: number[]): { meanDay: number; spreadDays: number } {
  const toAngle = (d: number) => ((d - 1) / 365.25) * 2 * Math.PI;
  let sx = 0;
  let sy = 0;
  for (const d of days) {
    sx += Math.cos(toAngle(d));
    sy += Math.sin(toAngle(d));
  }
  sx /= days.length;
  sy /= days.length;
  let meanAngle = Math.atan2(sy, sx);
  if (meanAngle < 0) meanAngle += 2 * Math.PI;
  const meanDay = Math.round((meanAngle / (2 * Math.PI)) * 365.25) + 1;
  const r = Math.sqrt(sx * sx + sy * sy); // 1 = perfectly consistent
  const spreadDays = Math.round((1 - r) * 365.25);
  return { meanDay, spreadDays };
}

/**
 * "Opportunity Opens" prediction (strategy § 9): for recurring opportunities
 * with at least two observed cycles, project the next expected opening window
 * with a confidence derived from how consistent past openings were.
 * Predictions are windows with confidence, never presented as facts.
 */
export function predictNextOpening(cycles: OpportunityCycle[], now: Date): OpeningPrediction | undefined {
  const openDays = cycles.map((c) => c.openedOn).filter((d): d is string => !!d);
  if (openDays.length < 2) return undefined;

  const { meanDay, spreadDays } = circularStats(openDays.map(dayOfYear));
  if (spreadDays > 45) return undefined; // not a stable annual pattern

  const confidence: OpeningPrediction['confidence'] =
    spreadDays <= 10 ? 'high' : spreadDays <= 25 ? 'medium' : 'low';

  // Project the mean day-of-year onto this year or next, whichever is upcoming.
  let year = now.getUTCFullYear();
  let expected = addDays(`${year}-01-01`, meanDay - 1);
  if (expected < isoDateOf(now)) {
    year += 1;
    expected = addDays(`${year}-01-01`, meanDay - 1);
  }
  const pad = Math.max(7, spreadDays);
  return {
    expectedOpenStart: addDays(expected, -pad),
    expectedOpenEnd: addDays(expected, pad),
    confidence,
    basedOnCycles: openDays.length,
  };
}

/** Record an observed opening/closing into the opportunity's cycle history (one entry per year). */
export function recordCycle(opp: Opportunity, cycle: OpportunityCycle): void {
  const year = (cycle.openedOn ?? cycle.closedOn)?.slice(0, 4);
  if (!year) return;
  const existing = opp.pastCycles.find((c) => (c.openedOn ?? c.closedOn)?.slice(0, 4) === year);
  if (existing) {
    existing.openedOn = cycle.openedOn ?? existing.openedOn;
    existing.closedOn = cycle.closedOn ?? existing.closedOn;
  } else {
    opp.pastCycles.push(cycle);
  }
}
