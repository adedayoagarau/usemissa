import type { Pool, PoolClient } from "pg";

type Db = Pool | PoolClient;

export const DEADLINE_REMINDER_OFFSET_CHOICES = [0, 1, 3, 7, 14] as const;
export type DeadlineReminderOffset =
  (typeof DEADLINE_REMINDER_OFFSET_CHOICES)[number];

/** How a creator wants deadlines planned and announced. */
export type CreatorPlanningPreferences = {
  /** Hours a week the creator can spend on applications; null until they say. */
  weeklyHoursAvailable: number | null;
  /** Days of slack kept before a start-by or sub-deadline. */
  defaultBufferDays: number;
  /** Creator corrections to effort estimates, in hours, keyed by material type. */
  materialEffort: Record<string, number>;
  /** Days before the deadline that default reminders fire. */
  defaultDeadlineOffsets: DeadlineReminderOffset[];
  /** Days without activity on a call in preparation before a gentle nudge. */
  goneQuietDays: number;
  deadlineDayAlarm: boolean;
  openingAlerts: boolean;
  /** Most notices a day, apart from the deadline-day alarm. */
  dailyNoticeCap: number;
  revision: number;
};

export const DEFAULT_PLANNING_PREFERENCES: CreatorPlanningPreferences = {
  weeklyHoursAvailable: null,
  defaultBufferDays: 2,
  materialEffort: {},
  defaultDeadlineOffsets: [7, 1],
  goneQuietDays: 21,
  deadlineDayAlarm: true,
  openingAlerts: true,
  dailyNoticeCap: 3,
  revision: 0,
};

type PreferenceRow = {
  weekly_hours_available: string | number | null;
  default_buffer_days: number;
  material_effort: Record<string, number> | null;
  default_deadline_offsets: number[];
  gone_quiet_days: number;
  deadline_day_alarm: boolean;
  opening_alerts: boolean;
  daily_notice_cap: number;
  revision: number;
};

export class PlanningPreferencesConflictError extends Error {
  constructor(readonly current: CreatorPlanningPreferences) {
    super("Planning preferences changed since they were loaded");
    this.name = "PlanningPreferencesConflictError";
  }
}

function fromRow(row: PreferenceRow): CreatorPlanningPreferences {
  return {
    weeklyHoursAvailable:
      row.weekly_hours_available === null
        ? null
        : Number(row.weekly_hours_available),
    defaultBufferDays: row.default_buffer_days,
    materialEffort: row.material_effort ?? {},
    defaultDeadlineOffsets: [...row.default_deadline_offsets]
      .filter((value): value is DeadlineReminderOffset =>
        (DEADLINE_REMINDER_OFFSET_CHOICES as readonly number[]).includes(value),
      )
      .sort((a, b) => b - a),
    goneQuietDays: row.gone_quiet_days,
    deadlineDayAlarm: row.deadline_day_alarm,
    openingAlerts: row.opening_alerts,
    dailyNoticeCap: row.daily_notice_cap,
    revision: row.revision,
  };
}

/** Thrown when saving before migration 0088 has created the preferences table. */
export class PlanningPreferencesUnavailableError extends Error {
  constructor() {
    super("Planning settings are not available yet");
    this.name = "PlanningPreferencesUnavailableError";
  }
}

/** False before migration 0088; reads then fall back to the defaults and saves are refused. */
export async function planningPreferencesAvailable(db: Db): Promise<boolean> {
  const result = await db.query<{ ready: boolean }>(
    "select to_regclass('public.creator_planning_preferences') is not null as ready",
  );
  return Boolean(result.rows[0]?.ready);
}

/** The creator's planning preferences, or the defaults when none are saved (revision 0). */
export async function getPlanningPreferences(
  db: Db,
  accountId: string,
): Promise<CreatorPlanningPreferences> {
  if (!(await planningPreferencesAvailable(db))) return { ...DEFAULT_PLANNING_PREFERENCES };
  const result = await db.query<PreferenceRow>(
    `select weekly_hours_available, default_buffer_days, material_effort, default_deadline_offsets,
            gone_quiet_days, deadline_day_alarm, opening_alerts, daily_notice_cap, revision
       from creator_planning_preferences where account_id = $1`,
    [accountId],
  );
  return result.rows[0]
    ? fromRow(result.rows[0])
    : { ...DEFAULT_PLANNING_PREFERENCES };
}

export type PlanningPreferencesInput = Omit<
  CreatorPlanningPreferences,
  "revision"
>;

/**
 * Save preferences when `expectedRevision` matches what is stored (0 when
 * nothing is stored yet). Throws PlanningPreferencesConflictError otherwise so
 * the client can reload instead of overwriting another device's change.
 * Throws PlanningPreferencesUnavailableError before migration 0088.
 */
export async function putPlanningPreferences(
  db: Db,
  accountId: string,
  input: PlanningPreferencesInput,
  expectedRevision: number,
): Promise<CreatorPlanningPreferences> {
  if (!(await planningPreferencesAvailable(db))) throw new PlanningPreferencesUnavailableError();
  const offsets = [...new Set(input.defaultDeadlineOffsets)].sort(
    (a, b) => b - a,
  );
  const values = [
    accountId,
    input.weeklyHoursAvailable,
    input.defaultBufferDays,
    JSON.stringify(input.materialEffort ?? {}),
    offsets,
    input.goneQuietDays,
    input.deadlineDayAlarm,
    input.openingAlerts,
    input.dailyNoticeCap,
  ];
  const result =
    expectedRevision === 0
      ? await db.query<PreferenceRow>(
          `insert into creator_planning_preferences
             (account_id, weekly_hours_available, default_buffer_days, material_effort, default_deadline_offsets,
              gone_quiet_days, deadline_day_alarm, opening_alerts, daily_notice_cap)
           values ($1, $2, $3, $4::jsonb, $5::smallint[], $6, $7, $8, $9)
           on conflict (account_id) do nothing
           returning weekly_hours_available, default_buffer_days, material_effort, default_deadline_offsets,
                     gone_quiet_days, deadline_day_alarm, opening_alerts, daily_notice_cap, revision`,
          values,
        )
      : await db.query<PreferenceRow>(
          `update creator_planning_preferences
              set weekly_hours_available = $2, default_buffer_days = $3, material_effort = $4::jsonb,
                  default_deadline_offsets = $5::smallint[], gone_quiet_days = $6, deadline_day_alarm = $7,
                  opening_alerts = $8, daily_notice_cap = $9, revision = revision + 1, updated_at = now()
            where account_id = $1 and revision = $10
            returning weekly_hours_available, default_buffer_days, material_effort, default_deadline_offsets,
                      gone_quiet_days, deadline_day_alarm, opening_alerts, daily_notice_cap, revision`,
          [...values, expectedRevision],
        );
  if (!result.rows[0])
    throw new PlanningPreferencesConflictError(
      await getPlanningPreferences(db, accountId),
    );
  return fromRow(result.rows[0]);
}
