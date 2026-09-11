import { randomUUID } from "node:crypto";
import type { EmailReviewCandidate, EmailReviewDecision, MyStatus } from "@missa/radar-engine";
import type { Pool, PoolClient } from "pg";
import { canonicalTrackerStatus } from "./canonicalTracker.js";
import { CreatorConflictError, CreatorRepositoryBase, type CreatorCommandEnvelope, type CreatorReceipt } from "./creatorRepository.js";

type CandidateRow = { id: string; state: string; data: EmailReviewCandidate; revision: number };
export type CreatorEmailCandidateView = EmailReviewCandidate & { revision: number };
export type CreatorEmailReviewResult = { candidate: CreatorEmailCandidateView; mutation: { trackerUpdated: boolean; manualEntryId?: string; statusEventId?: string }; receipt: CreatorReceipt };

const SENSITIVE = new Set<MyStatus>(["accepted", "declined", "waitlisted", "finalist", "shortlisted", "withdrawn"]);
const iso = () => new Date().toISOString();

export class CreatorEmailReviewError extends Error {
  constructor(readonly code: "invalid" | "not-found" | "forbidden" | "expired" | "conflict", message: string) { super(message); }
}

export class PostgresCreatorEmailReviewRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async candidates(accountId: string, userId: string, state: "pending" | "all" = "pending", classification?: string): Promise<CreatorEmailCandidateView[]> {
    const result = await this.query<CandidateRow>(
      `select c.id,c.state,c.data,c.revision from radar_email_candidates c
       where c.user_id=$2 and exists (select 1 from radar_accounts a where a.id=$1 and a.data->>'userId'=$2)
         and ($3='all' or c.state in ('pending','duplicate'))
         and ($4::text is null or c.data->>'classification'=$4)
         and coalesce((c.data->>'expiresAt')::timestamptz,now()-interval '1 second')>now()
       order by c.data->>'createdAt' desc,c.id desc limit 200`,
      [accountId, userId, state, classification ?? null],
    );
    return result.rows.map((row) => ({ ...row.data, state: row.state as EmailReviewCandidate["state"], revision: row.revision }));
  }

  async review(envelope: CreatorCommandEnvelope, userId: string, candidateId: string, decision: EmailReviewDecision): Promise<CreatorEmailReviewResult> {
    let mutation: CreatorEmailReviewResult["mutation"] | undefined;
    const receipt = await this.executeOwnerCommand(envelope, async (client) => {
      const current = await this.lockCandidate(client, envelope.accountId, userId, candidateId);
      if (current.revision !== envelope.expectedRevision) throw new CreatorConflictError("email-candidate", candidateId, envelope.expectedRevision, current.revision);
      const candidate = current.data;
      if (candidate.state === "deleted") throw new CreatorEmailReviewError("conflict", "This email has been deleted.");
      if (Date.parse(candidate.expiresAt) <= Date.now()) throw new CreatorEmailReviewError("expired", "This email is no longer available for review.");
      if (decision.kind === "ignore" || decision.kind === "delete") {
        candidate.state = decision.kind === "ignore" ? "ignored" : "deleted";
        if (decision.kind === "delete") {
          candidate.bodyExcerpt = ""; candidate.senderAddress = undefined; candidate.senderDomain = undefined; candidate.attachmentMetadata = [];
        }
        candidate.reviewedAt = iso(); candidate.reviewIdempotencyKey = decision.idempotencyKey;
        mutation = { trackerUpdated: false }; candidate.reviewResult = mutation;
      } else {
        const status = canonicalTrackerStatus(decision.status ?? candidate.proposedStatus ?? "");
        if (!status) throw new CreatorEmailReviewError("invalid", "Choose a status before confirming this update.");
        if (SENSITIVE.has(status) && !decision.status) throw new CreatorEmailReviewError("invalid", "Choose the status explicitly before confirming this sensitive update.");
        if (decision.kind === "confirm") mutation = await this.confirmTracked(client, envelope, candidate, decision.opportunityId, status);
        else mutation = await this.createManual(client, envelope.accountId, candidate, decision, status);
        candidate.state = "confirmed"; candidate.reviewedAt = iso(); candidate.reviewIdempotencyKey = decision.idempotencyKey; candidate.reviewResult = mutation;
      }
      const updated = await client.query<{ revision: number }>(
        `update radar_email_candidates set state=$4,data=$5::jsonb,revision=revision+1
         where id=$1 and user_id=$2 and revision=$3 returning revision`,
        [candidateId, userId, current.revision, candidate.state, JSON.stringify(candidate)],
      );
      if (!updated.rows[0]) throw new CreatorConflictError("email-candidate", candidateId, current.revision, current.revision + 1);
      return { resourceType: "email-candidate", resourceId: candidateId, revision: updated.rows[0].revision };
    });
    const candidate = (await this.candidates(envelope.accountId, userId, "all")).find((item) => item.id === candidateId);
    if (!candidate) {
      const result = await this.query<CandidateRow>("select id,state,data,revision from radar_email_candidates where id=$1 and user_id=$2", [candidateId, userId]);
      const row = result.rows[0];
      if (!row) throw new CreatorEmailReviewError("not-found", "Email update not found.");
      return { candidate: { ...row.data, state: row.state as EmailReviewCandidate["state"], revision: row.revision }, mutation: row.data.reviewResult ?? { trackerUpdated: false }, receipt };
    }
    return { candidate, mutation: candidate.reviewResult ?? mutation ?? { trackerUpdated: false }, receipt };
  }

  private async lockCandidate(client: PoolClient, accountId: string, userId: string, candidateId: string): Promise<CandidateRow> {
    const result = await client.query<CandidateRow>(
      `select c.id,c.state,c.data,c.revision from radar_email_candidates c
       where c.id=$1 and c.user_id=$2 and exists (select 1 from radar_accounts a where a.id=$3 and a.data->>'userId'=$2)
       for update`, [candidateId, userId, accountId],
    );
    if (!result.rows[0]) throw new CreatorEmailReviewError("not-found", "Email update not found.");
    return result.rows[0];
  }

  private async confirmTracked(client: PoolClient, envelope: CreatorCommandEnvelope, candidate: EmailReviewCandidate, opportunityId: string, status: MyStatus) {
    const tracked = await client.query<{ id: string; status: string; revision: number }>(
      "select id,status,revision from tracked_opportunities where account_id=$1 and opportunity_id=$2 for update",
      [envelope.accountId, opportunityId],
    );
    const row = tracked.rows[0];
    if (!row) throw new CreatorEmailReviewError("forbidden", "Track this opportunity before confirming an email update.");
    const eventId = randomUUID();
    await client.query("update tracked_opportunities set status=$3,revision=revision+1,updated_at=now() where id=$1 and account_id=$2", [row.id, envelope.accountId, status]);
    await client.query(
      `insert into tracked_status_events
       (id,tracked_opportunity_id,account_id,from_status,to_status,source,idempotency_key,note,confidence,candidate_id,evidence)
       values ($1,$2,$3,$4,$5,'email',$6,$7,$8,$9,$10::jsonb)`,
      [eventId, row.id, envelope.accountId, row.status, status, envelope.idempotencyKey, "Confirmed from private email evidence.", candidate.confidence, candidate.id, JSON.stringify({ sourceMode: candidate.sourceMode ?? "forwarding" })],
    );
    return { trackerUpdated: true, statusEventId: eventId };
  }

  private async createManual(client: PoolClient, accountId: string, candidate: EmailReviewCandidate, decision: Extract<EmailReviewDecision, { kind: "create-manual" }>, status: MyStatus) {
    const title = decision.title.trim(), organizationName = decision.organizationName.trim();
    if (!title || !organizationName || title.length > 240 || organizationName.length > 240) throw new CreatorEmailReviewError("invalid", "Title and organization are required.");
    const id = `manual_email_${randomUUID()}`, eventId = randomUUID();
    const detail = { work: decision.work?.trim().slice(0, 240), deadline: candidate.proposedDeadline, submittedAt: candidate.proposedSubmittedAt, notes: "Created from private email evidence.", importHash: `email:${candidate.id}`, events: [{ id: eventId, at: iso(), to: status, source: "email", confidence: candidate.confidence, candidateId: candidate.id }] };
    await client.query(
      `insert into tracker_manual_entries (id,account_id,title,organization_name,status,source_kind,detail)
       values ($1,$2,$3,$4,$5,'email',$6::jsonb)`,
      [id, accountId, title, organizationName, status, JSON.stringify(detail)],
    );
    return { trackerUpdated: true, manualEntryId: id, statusEventId: eventId };
  }
}
