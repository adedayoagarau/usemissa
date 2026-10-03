/**
 * Display rules for homepage totals. Only a positive total is shown, and it
 * earns the trailing "+"; an empty total is hidden rather than shown as "0+".
 */
export function formatHomepageStat(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Intl.NumberFormat("en").format(Math.floor(value));
}

export function visibleHomepageStats<T extends { value: number }>(
  stats: readonly T[],
): Array<T & { formatted: string }> {
  return stats.flatMap((stat) => {
    const formatted = formatHomepageStat(stat.value);
    return formatted ? [{ ...stat, formatted }] : [];
  });
}
