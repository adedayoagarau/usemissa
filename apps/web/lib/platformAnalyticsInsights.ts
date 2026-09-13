export interface JourneyStage {
  key: string;
  label: string;
  actors: number;
  conversionFromPrevious: number | null;
}

export function biggestJourneyDrop(stages: JourneyStage[]):
  | {
      from: string;
      to: string;
      lost: number;
      conversion: number;
    }
  | undefined {
  let result:
    { from: string; to: string; lost: number; conversion: number } | undefined;
  for (let index = 1; index < stages.length; index += 1) {
    const previous = stages[index - 1];
    const current = stages[index];
    if (!previous || !current || previous.actors === 0) continue;
    const lost = Math.max(previous.actors - current.actors, 0);
    const conversion = current.conversionFromPrevious ?? 0;
    if (!result || conversion < result.conversion) {
      result = {
        from: previous.label,
        to: current.label,
        lost,
        conversion,
      };
    }
  }
  return result;
}

export function activationRate(
  activated: number,
  newAccounts: number,
): number | null {
  if (newAccounts === 0) return null;
  return Math.round((activated / newAccounts) * 1_000) / 10;
}

export function trackingHealth(
  available: boolean,
  last24h: number,
  unregisteredEvents: number,
  authorityMismatches: number,
): "Healthy" | "Needs attention" | "No recent events" | "Unavailable" {
  if (!available) return "Unavailable";
  if (last24h === 0) return "No recent events";
  if (unregisteredEvents > 0 || authorityMismatches > 0)
    return "Needs attention";
  return "Healthy";
}
