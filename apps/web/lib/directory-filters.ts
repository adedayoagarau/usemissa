import type { ProfileBrowseQuery } from "@missa/radar-adapters";

type ScheduleState = NonNullable<ProfileBrowseQuery["scheduleState"]>;
type SortBy = NonNullable<ProfileBrowseQuery["sortBy"]>;

const SCHEDULE_STATES: readonly ScheduleState[] = [
  "open",
  "always_open",
  "closing_soon",
  "opening_soon",
  "closed",
  "all",
];

const SORT_OPTIONS: readonly SortBy[] = [
  "name_asc",
  "opening_soonest",
  "closing_soonest",
  "recently_updated",
];

export function parseDirectoryScheduleState(
  value: string | undefined,
): ProfileBrowseQuery["scheduleState"] {
  return SCHEDULE_STATES.includes(value as ScheduleState)
    ? (value as ScheduleState)
    : undefined;
}

export function parseDirectorySort(
  value: string | undefined,
): ProfileBrowseQuery["sortBy"] {
  return SORT_OPTIONS.includes(value as SortBy) ? (value as SortBy) : undefined;
}
