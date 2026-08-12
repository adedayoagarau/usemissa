import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { MyStatus, OpportunityType } from "@missa/radar-engine";

export type CanonicalTrackerSave = {
  status: "created" | "already-present";
  tracked: {
    id: string;
    accountId: string;
    opportunityId: string;
    status: string;
    trackedAt: string;
    updatedAt: string;
  };
};

export type CanonicalTrackerStatus =
  | "interested"
  | "preparing"
  | "submitted"
  | "withdrawn"
  | "accepted"
  | "declined"
  | "archived";

export type CanonicalTrackerItem = {
  opportunityId: string;
  title: string;
  organizationName?: string;
  type: OpportunityType;
  opportunityStatus: string;
  myStatus: MyStatus;
  deadline?: string;
  deadlineKind: string;
};

type TrackerRow = {
  id: string;
  account_id: string;
  opportunity_id: string;
  status: string;
  tracked_at: Date | string;
  updated_at: Date | string;
};

type TrackerOpportunityRow = TrackerRow & {
  title: string;
  organization_name: string | null;
  opportunity_status: string;
  opportunity_type: string;
  deadline_date: string | null;
  deadline_kind: string | null;
};

const OPPORTUNITY_TYPES = new Set<OpportunityType>([
  "open-call",
  "magazine",
  "grant",
  "award",
  "fellowship",
  "residency",
  "festival",
  "scholarship",
  "conference",
  "rfp",
  "contest",
  "pitch",
  "exhibition",
  "commission",
  "other",
]);

const CANONICAL_STATUSES = new Set<CanonicalTrackerStatus>([
  "interested",
  "preparing",
  "submitted",
  "withdrawn",
  "accepted",
  "declined",
  "archived",
]);

function opportunityType(value: string): OpportunityType {
  return OPPORTUNITY_TYPES.has(value as OpportunityType)
    ? (value as OpportunityType)
    : "other";
}

function deadlineKind(value: string | null): string {
  if (value === "fixed") return "exact";
  return value || "unknown";
}

function trackerItem(row: TrackerOpportunityRow): CanonicalTrackerItem {
  const status = CANONICAL_STATUSES.has(row.status as CanonicalTrackerStatus)
    ? (row.status as CanonicalTrackerStatus)
    : "interested";
  return {
    opportunityId: row.opportunity_id,
    title: row.title,
    organizationName: row.organization_name ?? undefined,
    type: opportunityType(row.opportunity_type),
    opportunityStatus: row.opportunity_status,
    myStatus: status,
    deadline: row.deadline_date ?? undefined,
    deadlineKind: deadlineKind(row.deadline_kind),
  };
}

/**
 * Read the relational Tracker projection for the signed-in account. This is
 * intentionally separate from the legacy Radar snapshot while the two stores
 * are being migrated.
 */
export async function listCanonicalTrackedOpportunities(
  connectionString: string,
  accountId: string,
): Promise<CanonicalTrackerItem[]> {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const result = await pool.query<TrackerOpportunityRow>(
      `select t.id, t.account_id, t.opportunity_id, t.status, t.tracked_at, t.updated_at,
              o.title, coalesce(org.data->>'name', o.organization_id) as organization_name, o.status as opportunity_status,
              o.type as opportunity_type, o.deadline_date, o.deadline_kind
       from tracked_opportunities t
       join opportunities o on o.id = t.opportunity_id
       left join radar_organizations org on org.id = o.organization_id
       where t.account_id = $1
       order by t.updated_at desc, t.id desc`,
      [accountId],
    );
    return result.rows.map(trackerItem);
  } finally {
    await pool.end();
  }
}

/** Map the richer legacy Tracker vocabulary onto canonical relational stages. */
export function canonicalTrackerStatus(
  value: string,
): CanonicalTrackerStatus | null {
  switch (value) {
    case "saved":
    case "interested":
      return "interested";
    case "preparing":
    case "draft-started":
    case "ready-to-submit":
      return "preparing";
    case "submitted":
    case "received":
    case "in-review":
    case "longlisted":
    case "shortlisted":
    case "finalist":
    case "waitlisted":
    case "revision-requested":
      return "submitted";
    case "withdrawn":
      return "withdrawn";
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
    case "archived":
      return "archived";
    default:
      return null;
  }
}

export type CanonicalTrackerStatusUpdate = {
  status: "updated" | "unchanged";
  tracked: CanonicalTrackerItem;
};

export async function updateCanonicalTrackerStatus(
  connectionString: string,
  accountId: string,
  opportunityId: string,
  status: CanonicalTrackerStatus,
): Promise<CanonicalTrackerStatusUpdate | null> {
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<TrackerOpportunityRow>(
      `select t.id, t.account_id, t.opportunity_id, t.status, t.tracked_at, t.updated_at,
              o.title, coalesce(org.data->>'name', o.organization_id) as organization_name, o.status as opportunity_status,
              o.type as opportunity_type, o.deadline_date, o.deadline_kind
       from tracked_opportunities t
       join opportunities o on o.id = t.opportunity_id
       left join radar_organizations org on org.id = o.organization_id
       where t.account_id = $1 and t.opportunity_id = $2
       for update of t`,
      [accountId, opportunityId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }
    if (row.status === status) {
      await client.query("COMMIT");
      return { status: "unchanged", tracked: trackerItem(row) };
    }

    const updated = await client.query<TrackerRow>(
      `update tracked_opportunities
       set status = $3, updated_at = now()
       where account_id = $1 and opportunity_id = $2
       returning id, account_id, opportunity_id, status, tracked_at, updated_at`,
      [accountId, opportunityId, status],
    );
    await client.query(
      `insert into tracked_status_events
         (tracked_opportunity_id, from_status, to_status, source)
       values ($1, $2, $3, 'user')`,
      [row.id, row.status, status],
    );
    await client.query("COMMIT");
    const next = updated.rows[0];
    return next
      ? {
          status: "updated",
          tracked: trackerItem({ ...row, ...next }),
        }
      : null;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function trackedRow(row: TrackerRow): CanonicalTrackerSave["tracked"] {
  return {
    id: row.id,
    accountId: row.account_id,
    opportunityId: row.opportunity_id,
    status: row.status,
    trackedAt: new Date(row.tracked_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Save an authoritative opportunity for an account during the migration from
 * the legacy Radar JSON snapshot to the relational opportunity projection.
 * The schema and its migrations belong to @missa/db; this adapter only owns
 * the request-time transaction.
 */
export async function saveCanonicalOpportunityToTracker(
  connectionString: string,
  accountId: string,
  opportunityId: string,
): Promise<CanonicalTrackerSave | null> {
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const opportunity = await client.query<{ id: string }>(
      "select id from opportunities where id = $1 and publication_state = 'published'",
      [opportunityId],
    );
    if (!opportunity.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const inserted = await client.query<TrackerRow>(
      `insert into tracked_opportunities
         (id, account_id, opportunity_id, status, tracked_at, updated_at)
       values ($1, $2, $3, 'interested', now(), now())
       on conflict (account_id, opportunity_id) do nothing
       returning id, account_id, opportunity_id, status, tracked_at, updated_at`,
      [`tracked_${randomUUID()}`, accountId, opportunityId],
    );

    if (inserted.rows[0]) {
      await client.query(
        `insert into tracked_status_events
           (tracked_opportunity_id, from_status, to_status, source)
         values ($1, null, 'interested', 'user')`,
        [inserted.rows[0].id],
      );
      await client.query("COMMIT");
      return { status: "created", tracked: trackedRow(inserted.rows[0]) };
    }

    const existing = await client.query<TrackerRow>(
      `select id, account_id, opportunity_id, status, tracked_at, updated_at
       from tracked_opportunities
       where account_id = $1 and opportunity_id = $2`,
      [accountId, opportunityId],
    );
    await client.query("COMMIT");
    const row = existing.rows[0];
    return row ? { status: "already-present", tracked: trackedRow(row) } : null;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
