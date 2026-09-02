import type { MatchCriteria, OpportunityPreferences, TaxonomyPreference } from "@missa/radar-engine";
import type { Pool, PoolClient } from "pg";
import { CreatorConflictError, CreatorRepositoryBase, type CreatorCommandEnvelope, type CreatorReceipt } from "./creatorRepository.js";

export type CreatorSavedSearchView = Readonly<{
  id: string;
  userId: string;
  name: string;
  criteria: MatchCriteria;
  includeInDigest: boolean;
  revision: number;
}>;

export type CreatorFollowView = Readonly<{
  organizationId: string;
  organizationName: string;
  followedAt: string;
  revision: number;
}>;

type PreferenceRow = {
  types: string[]; disciplines: string[]; genres: string[]; locations: string[]; career_stages: string[];
  max_fee_cents: number | null; no_fee_only: boolean; deadline_within_days: number | null; simultaneous_required: boolean; revision: number;
};

export type CreatorPreferenceBundle = Readonly<{ opportunityPreferences: OpportunityPreferences; taxonomyPreferences: TaxonomyPreference[]; revision: number }>;

export class PostgresCreatorPreferenceRepository extends CreatorRepositoryBase {
  constructor(pool: Pool) { super(pool); }

  async opportunityPreferences(accountId: string): Promise<OpportunityPreferences | undefined> {
    const result = await this.query<PreferenceRow>(
      `select types, disciplines, genres, locations, career_stages, max_fee_cents,
              no_fee_only, deadline_within_days, simultaneous_required, revision
       from opportunity_preferences where account_id = $1`, [accountId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      types: row.types as OpportunityPreferences["types"], disciplines: row.disciplines, genres: row.genres,
      locations: row.locations, careerStages: row.career_stages, ...(row.max_fee_cents === null ? {} : { maxFeeCents: row.max_fee_cents }),
      noFeeOnly: row.no_fee_only, ...(row.deadline_within_days === null ? {} : { deadlineWithinDays: row.deadline_within_days }),
      simultaneousRequired: row.simultaneous_required,
    };
  }

  async preferenceBundle(accountId: string): Promise<CreatorPreferenceBundle | undefined> {
    const result = await this.query<PreferenceRow>(
      `select types, disciplines, genres, locations, career_stages, max_fee_cents,
              no_fee_only, deadline_within_days, simultaneous_required, revision
       from opportunity_preferences where account_id = $1`, [accountId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const opportunityPreferences = await this.opportunityPreferences(accountId);
    if (!opportunityPreferences) return undefined;
    return { opportunityPreferences, taxonomyPreferences: await this.taxonomyPreferences(accountId), revision: row.revision };
  }

  async updatePreferences(
    envelope: CreatorCommandEnvelope,
    taxonomyPreferences: readonly TaxonomyPreference[],
    preferences: OpportunityPreferences,
  ): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const updated = await client.query<{ account_id: string; revision: number }>(
        `update opportunity_preferences set
           types=$3, disciplines=$4, genres=$5, locations=$6, career_stages=$7,
           max_fee_cents=$8, no_fee_only=$9, deadline_within_days=$10,
           simultaneous_required=$11, revision=revision+1, updated_at=now()
         where account_id=$1 and revision=$2 returning account_id, revision`,
        [envelope.accountId, envelope.expectedRevision, preferences.types, preferences.disciplines, preferences.genres, preferences.locations,
          preferences.careerStages, preferences.maxFeeCents ?? null, preferences.noFeeOnly, preferences.deadlineWithinDays ?? null, preferences.simultaneousRequired],
      );
      const row = updated.rows[0];
      if (!row) return this.throwPreferenceConflict(client, envelope);
      await client.query("delete from account_taxonomy_preferences where account_id=$1 and origin='explicit'", [envelope.accountId]);
      for (const preference of taxonomyPreferences) {
        await client.query(
          `insert into account_taxonomy_preferences (account_id, term_id, preference, weight, origin)
           values ($1,$2,$3,$4,'explicit')`,
          [envelope.accountId, preference.termId, preference.preference, preference.weight],
        );
      }
      return { resourceType: "creator-preferences", resourceId: envelope.accountId, revision: row.revision };
    });
  }

  private async throwPreferenceConflict(client: PoolClient, envelope: CreatorCommandEnvelope): Promise<never> {
    const current = await client.query<{ revision: number }>("select revision from opportunity_preferences where account_id=$1 for update", [envelope.accountId]);
    throw new CreatorConflictError("creator-preferences", envelope.accountId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
  }

  async taxonomyPreferences(accountId: string): Promise<TaxonomyPreference[]> {
    const result = await this.query<{ term_id: string; preference: TaxonomyPreference["preference"]; weight: number }>(
      `select term_id, preference, weight from account_taxonomy_preferences
       where account_id = $1 order by term_id`, [accountId],
    );
    return result.rows.map((row) => ({ termId: row.term_id, preference: row.preference, weight: row.weight }));
  }

  async savedSearches(accountId: string, userId: string): Promise<CreatorSavedSearchView[]> {
    const result = await this.query<{ id: string; name: string; criteria: MatchCriteria; include_in_digest: boolean; revision: number }>(
      `select id, name, criteria, include_in_digest, revision from saved_searches
       where account_id = $1 order by updated_at desc, id desc`, [accountId],
    );
    return result.rows.map((row) => ({ id: row.id, userId, name: row.name, criteria: row.criteria, includeInDigest: row.include_in_digest, revision: row.revision }));
  }

  async savedSearch(accountId: string, userId: string, searchId: string): Promise<CreatorSavedSearchView | undefined> {
    return (await this.savedSearches(accountId, userId)).find((item) => item.id === searchId);
  }

  async createSavedSearch(
    envelope: CreatorCommandEnvelope,
    input: { id: string; name: string; criteria: MatchCriteria; includeInDigest: boolean },
  ): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const inserted = await client.query<{ id: string; revision: number }>(
        `insert into saved_searches (id, account_id, name, criteria, include_in_digest)
         values ($1,$2,$3,$4::jsonb,$5) returning id, revision`,
        [input.id, envelope.accountId, input.name, JSON.stringify(input.criteria), input.includeInDigest],
      );
      const row = inserted.rows[0]!;
      return { resourceType: "saved-search", resourceId: row.id, revision: row.revision };
    });
  }

  async deleteSavedSearch(envelope: CreatorCommandEnvelope, searchId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const deleted = await client.query<{ id: string; revision: number }>(
        `delete from saved_searches where id=$1 and account_id=$2 and revision=$3 returning id, revision`,
        [searchId, envelope.accountId, envelope.expectedRevision],
      );
      const row = deleted.rows[0];
      if (!row) {
        const current = await client.query<{ revision: number }>("select revision from saved_searches where id=$1 and account_id=$2 for update", [searchId, envelope.accountId]);
        throw new CreatorConflictError("saved-search", searchId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
      }
      return { resourceType: "saved-search", resourceId: row.id, revision: row.revision + 1 };
    });
  }

  async updateSavedSearch(envelope: CreatorCommandEnvelope, input: { id: string; name: string; criteria: MatchCriteria; includeInDigest: boolean }): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const updated = await client.query<{ id: string; revision: number }>(
        `update saved_searches set name=$4, criteria=$5::jsonb, include_in_digest=$6,
           revision=revision+1, updated_at=now()
         where id=$1 and account_id=$2 and revision=$3 returning id, revision`,
        [input.id, envelope.accountId, envelope.expectedRevision, input.name, JSON.stringify(input.criteria), input.includeInDigest],
      );
      const row = updated.rows[0];
      if (!row) {
        const current = await client.query<{ revision: number }>("select revision from saved_searches where id=$1 and account_id=$2 for update", [input.id, envelope.accountId]);
        throw new CreatorConflictError("saved-search", input.id, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
      }
      return { resourceType: "saved-search", resourceId: row.id, revision: row.revision };
    });
  }

  async follows(accountId: string): Promise<CreatorFollowView[]> {
    const result = await this.query<{ organization_id: string; organization_name: string; created_at: Date | string; revision: number }>(
      `select f.organization_id, coalesce(o.data->>'name', f.organization_id) as organization_name,
              f.created_at, f.revision
       from organization_follows f join radar_organizations o on o.id = f.organization_id
       where f.account_id = $1 order by f.created_at desc`, [accountId],
    );
    return result.rows.map((row) => ({ organizationId: row.organization_id, organizationName: row.organization_name, followedAt: new Date(row.created_at).toISOString(), revision: row.revision }));
  }

  async followOrganization(envelope: CreatorCommandEnvelope, organizationId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const inserted = await client.query<{ revision: number }>(
        `insert into organization_follows (account_id, organization_id)
         select $1, id from radar_organizations where id=$2
         returning revision`, [envelope.accountId, organizationId],
      );
      if (!inserted.rows[0]) throw new CreatorConflictError("organization-follow", organizationId, 1, 0);
      return { resourceType: "organization-follow", resourceId: organizationId, revision: inserted.rows[0].revision };
    });
  }

  async unfollowOrganization(envelope: CreatorCommandEnvelope, organizationId: string): Promise<CreatorReceipt> {
    return this.executeOwnerCommand(envelope, async (client) => {
      const removed = await client.query<{ revision: number }>(
        `delete from organization_follows where account_id=$1 and organization_id=$2 and revision=$3 returning revision`,
        [envelope.accountId, organizationId, envelope.expectedRevision],
      );
      const row = removed.rows[0];
      if (!row) {
        const current = await client.query<{ revision: number }>("select revision from organization_follows where account_id=$1 and organization_id=$2 for update", [envelope.accountId, organizationId]);
        throw new CreatorConflictError("organization-follow", organizationId, envelope.expectedRevision, current.rows[0]?.revision ?? 0);
      }
      return { resourceType: "organization-follow", resourceId: organizationId, revision: row.revision + 1 };
    });
  }
}
