/**
 * The homepage list shows one call per organization, so a magazine with
 * three open sections fills one card rather than a third of the first
 * screen. Order is kept: each organization is represented by its first call
 * in the list. Calls with no organization are kept as they are. Pure, tested
 * in onePerOrganization.test.ts.
 */
export function onePerOrganization<
  T extends { id: string; organizationId?: string; organizationName?: string },
>(items: readonly T[], limit: number): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const item of items) {
    if (picked.length >= limit) break;
    const key =
      item.organizationId ??
      (item.organizationName ? `name:${item.organizationName.trim().toLowerCase()}` : null);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    picked.push(item);
  }
  return picked;
}
