import type { AlertKind } from "@missa/radar-engine";
import type { Pool } from "pg";
import { CreatorConflictError, CreatorRepositoryBase, type CreatorCommandEnvelope, type CreatorReceipt } from "./creatorRepository.js";
import { canonicalPublicOpportunityPredicate } from "./canonicalOpportunityProjection.js";

export type CreatorInboxAlertView = Readonly<{
  id: string; opportunityId?: string; kind: AlertKind; title: string; body: string;
  reason: string; dedupeKey: string; deliveryEligibility: string; readAt?: string;
  revision: number; createdAt: string;
}>;

type AlertRow = {
  id: string; opportunity_id: string | null; kind: AlertKind; title: string; body: string;
  reason: string | null; dedupe_key: string; delivery_eligibility: string;
  read_at: Date | string | null; revision: number; created_at: Date | string;
};

function iso(value: Date | string): string { return new Date(value).toISOString(); }
function view(row: AlertRow): CreatorInboxAlertView {
  return {
    id: row.id,
    ...(row.opportunity_id ? { opportunityId: row.opportunity_id } : {}),
    kind: row.kind, title: row.title, body: row.body,
    reason: row.reason ?? "This update belongs to your Missa account.",
    dedupeKey: row.dedupe_key, deliveryEligibility: row.delivery_eligibility,
    ...(row.read_at ? { readAt: iso(row.read_at) } : {}),
    revision: row.revision, createdAt: iso(row.created_at),
  };
}

export class PostgresCreatorInboxRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async alerts(accountId: string): Promise<CreatorInboxAlertView[]> {
    const result = await this.query<AlertRow>(
      `select alert.id,alert.opportunity_id,alert.kind,alert.title,alert.body,alert.reason,alert.dedupe_key,alert.delivery_eligibility,alert.read_at,alert.revision,alert.created_at
       from creator_inbox_alerts alert
       left join opportunities o on o.id=alert.opportunity_id
       where alert.account_id=$1 and (alert.opportunity_id is null or ${canonicalPublicOpportunityPredicate("o")})
       order by alert.created_at desc,alert.id desc limit 500`,
      [accountId],
    );
    return result.rows.map(view);
  }

  async setEmailEligibility(accountId: string, alertIds: readonly string[], eligible: boolean): Promise<void> {
    if (!alertIds.length) return;
    const value = eligible ? "in-app,email" : "in-app";
    await this.query(
      `update creator_inbox_alerts set delivery_eligibility=$3,revision=revision+1,updated_at=now()
       where account_id=$1 and id=any($2::text[]) and delivery_eligibility<>$3`,
      [accountId, alertIds, value],
    );
  }

  async markRead(envelope: CreatorCommandEnvelope, items: readonly { id: string; revision: number }[]): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const unique = [...new Map(items.map((item) => [item.id, item])).values()];
      if (!unique.length) return { resourceType: "inbox-alert", resourceId: envelope.accountId, revision: 1 };
      let highestRevision = 1;
      for (const item of unique) {
        const updated = await client.query<{ revision: number }>(
          `update creator_inbox_alerts set read_at=coalesce(read_at,now()),
             revision=case when read_at is null then revision+1 else revision end,updated_at=now()
           where id=$1 and account_id=$2 and revision=$3 returning revision`,
          [item.id, envelope.accountId, item.revision],
        );
        const row = updated.rows[0];
        if (!row) {
          const current = await client.query<{ revision: number }>(
            "select revision from creator_inbox_alerts where id=$1 and account_id=$2 for update",
            [item.id, envelope.accountId],
          );
          throw new CreatorConflictError("inbox-alert", item.id, item.revision, current.rows[0]?.revision ?? 0);
        }
        highestRevision = Math.max(highestRevision, row.revision);
      }
      return { resourceType: "inbox-alert", resourceId: envelope.accountId, revision: highestRevision };
    });
  }
}
