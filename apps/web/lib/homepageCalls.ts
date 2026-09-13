import type { opportunityBrowseResponseSchema } from "@missa/contracts";

export type HomepageCall = ReturnType<
  typeof opportunityBrowseResponseSchema.parse
>["items"][number];

/**
 * Pick the calls shown in the homepage strip.
 *
 * Prefer actionable calls and one per type, so the strip does not open with
 * three residencies in a row. Shared by the server prefetch and the client
 * refresh so both paths produce the same selection for the same input.
 */
export function selectHomepageCalls(
  items: HomepageCall[],
  limit = 3,
): HomepageCall[] {
  const actionable = items.filter(
    (item) => item.submissionAvailable && item.type !== "other",
  );
  const candidates = actionable.length ? actionable : items;
  const types = new Set<string>();
  const varied = candidates.filter((item) => {
    if (types.has(item.type)) return false;
    types.add(item.type);
    return true;
  });
  return [
    ...varied,
    ...candidates.filter((item) => !varied.includes(item)),
  ].slice(0, limit);
}
