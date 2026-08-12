import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export const PROFILE_IDENTITY_MATCHER_VERSION = "profile-host-name-v2";

const NAME_STOP_WORDS = new Set([
  "a", "an", "and", "award", "awards", "call", "contest", "for", "from",
  "journal", "literary", "magazine", "of", "open", "press", "prize",
  "publication", "publications", "review", "submission", "submissions", "the",
]);

export type ProfileUrlEvidence = {
  profileId: string;
  profileName: string;
  profileCheckedAt: string | null;
  url: string;
  aliasKind: "official" | "submission" | "alternate";
};

export type OpportunityIdentityInput = {
  opportunityId: string;
  title: string;
  organizationName: string | null;
  sourceName: string | null;
  sourceCheckedAt: string | null;
  sourceUrl: string | null;
  guidelinesUrl: string | null;
  submissionUrl: string | null;
};

export type ProfileIdentityDecision = {
  profileId: string;
  opportunityId: string;
  relation: "host" | "submission";
  status: "pending" | "confirmed";
  confidence: number;
  matchedHost: string;
  opportunityUrl: string;
  profileUrl: string;
  nameScore: number;
  matchedNameTokens: string[];
  identityBasis: "call-name" | "exact-url";
  profileCheckedAt: string | null;
  opportunityCheckedAt: string | null;
};

type NameEvidence = { score: number; matchedTokens: string[] };

export function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

function tokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !NAME_STOP_WORDS.has(token));
}

function compact(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function profileNameEvidence(
  profileName: string,
  context: string[],
  host: string,
  allowHostBrand = true,
): NameEvidence {
  const profileTokens = [...new Set(tokens(profileName))];
  const contextText = context.filter(Boolean).join(" ");
  const contextTokens = new Set(tokens(contextText));
  const matchedTokens = profileTokens.filter((token) => contextTokens.has(token));
  const profileCompact = compact(profileName);
  const contextCompact = compact(contextText);
  const hostBrand = compact(host.split(".")[0] ?? "");

  let score = profileTokens.length ? matchedTokens.length / profileTokens.length : 0;
  if (profileCompact.length >= 4 && contextCompact.includes(profileCompact)) score = 1;
  if (
    allowHostBrand &&
    profileCompact.length >= 4 && hostBrand.length >= 4 &&
    (hostBrand.includes(profileCompact) || profileCompact.includes(hostBrand))
  ) {
    score = Math.max(score, 0.75);
    if (!matchedTokens.length) matchedTokens.push(hostBrand);
  }
  return { score: Math.min(1, Number(score.toFixed(3))), matchedTokens: [...new Set(matchedTokens)] };
}

function normalizedIdentityUrl(value: string): string | null {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${host}${pathname}`;
  } catch {
    return null;
  }
}

function opportunityUrls(input: OpportunityIdentityInput): Array<{ url: string; relation: "host" | "submission" }> {
  const candidates: Array<{ url: string | null; relation: "host" | "submission" }> = [
    { url: input.sourceUrl, relation: "host" },
    { url: input.guidelinesUrl, relation: "host" },
    { url: input.submissionUrl, relation: "submission" },
  ];
  const seen = new Set<string>();
  return candidates.flatMap(({ url, relation }) => {
    if (!url) return [];
    const key = `${relation}:${url}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ url, relation }];
  });
}

export function matchOpportunityToProfiles(
  opportunity: OpportunityIdentityInput,
  profileUrls: ProfileUrlEvidence[],
  now = new Date(),
): ProfileIdentityDecision[] {
  const byHost = new Map<string, ProfileUrlEvidence[]>();
  for (const profile of profileUrls) {
    const host = normalizeHost(profile.url);
    if (!host) continue;
    const bucket = byHost.get(host) ?? [];
    bucket.push(profile);
    byHost.set(host, bucket);
  }

  // Source names often describe an aggregator page rather than the call owner.
  // Only the call title and extracted organizer identity are safe name evidence.
  const context = [opportunity.title, opportunity.organizationName ?? ""];
  const decisions = new Map<string, ProfileIdentityDecision>();

  for (const candidateUrl of opportunityUrls(opportunity)) {
    const host = normalizeHost(candidateUrl.url);
    if (!host) continue;
    const scored = (byHost.get(host) ?? []).map((profile) => {
      const callName = profileNameEvidence(profile.profileName, context, host, false);
      const hostName = profileNameEvidence(profile.profileName, [], host, true);
      const exactUrl = normalizedIdentityUrl(candidateUrl.url) === normalizedIdentityUrl(profile.url);
      const identityBasis: ProfileIdentityDecision["identityBasis"] =
        callName.score >= 0.35 ? "call-name" : "exact-url";
      return {
        profile,
        score: Math.max(callName.score, exactUrl ? hostName.score : 0),
        matchedTokens: callName.score >= 0.35 ? callName.matchedTokens : hostName.matchedTokens,
        identityBasis,
        hasCompatibleIdentity: callName.score >= 0.35 || (exactUrl && hostName.score >= 0.75),
      };
    });
    const bestByProfile = new Map<string, (typeof scored)[number]>();
    for (const candidate of scored) {
      const current = bestByProfile.get(candidate.profile.profileId);
      if (!current || candidate.score > current.score) bestByProfile.set(candidate.profile.profileId, candidate);
    }
    const unique = [...bestByProfile.values()].sort((left, right) => right.score - left.score);
    const best = unique[0];
    const runnerUp = unique[1];
    for (const candidate of unique) {
      const freshOpportunity = isFresh(opportunity.sourceCheckedAt, 3, now);
      const freshProfile = isFresh(candidate.profile.profileCheckedAt, 14, now);
      const isUnambiguousBest = candidate === best && candidate.hasCompatibleIdentity &&
        (!runnerUp || candidate.score - runnerUp.score >= 0.15) && freshOpportunity && freshProfile;
      const key = `${candidate.profile.profileId}:${candidateUrl.relation}`;
      const decision: ProfileIdentityDecision = {
        profileId: candidate.profile.profileId,
        opportunityId: opportunity.opportunityId,
        relation: candidateUrl.relation,
        status: isUnambiguousBest ? "confirmed" : "pending",
        confidence: Number((0.7 + candidate.score * 0.3).toFixed(3)),
        matchedHost: host,
        opportunityUrl: candidateUrl.url,
        profileUrl: candidate.profile.url,
        nameScore: candidate.score,
        matchedNameTokens: candidate.matchedTokens,
        identityBasis: candidate.identityBasis,
        profileCheckedAt: candidate.profile.profileCheckedAt,
        opportunityCheckedAt: opportunity.sourceCheckedAt,
      };
      const current = decisions.get(key);
      if (!current || decision.confidence > current.confidence || decision.status === "confirmed") decisions.set(key, decision);
    }
  }
  return [...decisions.values()];
}

function isFresh(value: string | null, maxAgeDays: number, now: Date): boolean {
  if (!value) return false;
  const checkedAt = new Date(value);
  if (!Number.isFinite(checkedAt.getTime()) || checkedAt > now) return false;
  return now.getTime() - checkedAt.getTime() <= maxAgeDays * 86_400_000;
}

function linkId(decision: ProfileIdentityDecision): string {
  return createHash("sha256")
    .update(`${decision.profileId}:${decision.opportunityId}:${decision.relation}`)
    .digest("hex");
}

async function persistDecisions(client: PoolClient, opportunityId: string, decisions: ProfileIdentityDecision[]): Promise<void> {
  await client.query(
    `update opportunity_profile_links
     set status = 'rejected', verified_at = now(), verified_until = null, updated_at = now(),
         evidence_json = evidence_json || jsonb_build_object('retiredBy', $2::text, 'retiredAt', now())
     where opportunity_id = $1 and evidence_json ->> 'matcherVersion' like 'profile-host-name-v%'`,
    [opportunityId],
  );
  for (const decision of decisions) {
    await client.query(
      `insert into opportunity_profile_links
         (id, opportunity_id, profile_id, relation, status, confidence, matched_host,
          opportunity_url, profile_url, name_score, matched_name_tokens, evidence_json,
          profile_checked_at, opportunity_checked_at, verified_at, verified_until)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         jsonb_build_object('matcherVersion', $12::text, 'rule', 'exact-host-plus-call-identity',
           'identityBasis', $13::text),
         $14, $15, now(), now() + interval '7 days')
       on conflict (profile_id, opportunity_id, relation) do update set
         status = excluded.status, confidence = excluded.confidence,
         matched_host = excluded.matched_host, opportunity_url = excluded.opportunity_url,
         profile_url = excluded.profile_url, name_score = excluded.name_score,
         matched_name_tokens = excluded.matched_name_tokens, evidence_json = excluded.evidence_json,
         profile_checked_at = excluded.profile_checked_at,
         opportunity_checked_at = excluded.opportunity_checked_at,
         verified_at = excluded.verified_at, verified_until = excluded.verified_until,
         updated_at = now()`,
      [
        linkId(decision), decision.opportunityId, decision.profileId, decision.relation,
        decision.status, decision.confidence, decision.matchedHost, decision.opportunityUrl,
        decision.profileUrl, decision.nameScore, decision.matchedNameTokens,
        PROFILE_IDENTITY_MATCHER_VERSION, decision.identityBasis,
        decision.profileCheckedAt, decision.opportunityCheckedAt,
      ],
    );
  }
  const confirmedCount = decisions.filter((decision) => decision.status === "confirmed").length;
  const status = confirmedCount > 0 ? "confirmed" : decisions.length > 0 ? "pending" : "no-match";
  await client.query(
    `insert into opportunity_profile_identity_checks
       (opportunity_id, matcher_version, status, candidate_count, confirmed_count,
        checked_at, next_check_at, evidence_json)
     values ($1, $2, $3, $4, $5, now(),
       now() + case when $3 = 'confirmed' then interval '7 days' else interval '1 day' end,
       jsonb_build_object('rule', 'exact-host-plus-call-identity'))
     on conflict (opportunity_id) do update set
       matcher_version = excluded.matcher_version, status = excluded.status,
       candidate_count = excluded.candidate_count, confirmed_count = excluded.confirmed_count,
       checked_at = excluded.checked_at, next_check_at = excluded.next_check_at,
       evidence_json = excluded.evidence_json, updated_at = now()`,
    [opportunityId, PROFILE_IDENTITY_MATCHER_VERSION, status, decisions.length, confirmedCount],
  );
}

export async function syncProfileOpportunityLinks(
  pool: Pool,
  limit = 100,
): Promise<{ opportunities: number; decisions: number; confirmed: number; pending: number }> {
  const [opportunityResult, profileResult] = await Promise.all([
    pool.query<OpportunityIdentityInput>(
      `select o.id as "opportunityId", o.title,
         latest_version.fields ->> 'organizationName' as "organizationName",
         s.name as "sourceName",
         o.source_checked_at as "sourceCheckedAt", s.url as "sourceUrl",
         o.guidelines_url as "guidelinesUrl", o.submission_url as "submissionUrl"
       from opportunities o join opportunity_sources s on s.id = o.source_id
       left join lateral (
         select fields from opportunity_versions
         where opportunity_id = o.id order by created_at desc limit 1
       ) latest_version on true
       left join opportunity_profile_identity_checks identity_check on identity_check.opportunity_id = o.id
       where o.publication_state in ('reviewable', 'published')
         and (s.url is not null or o.guidelines_url is not null or o.submission_url is not null)
         and (identity_check.opportunity_id is null or identity_check.matcher_version <> $2 or identity_check.next_check_at <= now())
       order by identity_check.next_check_at asc nulls first, coalesce(o.source_checked_at, o.updated_at) desc nulls last
       limit $1`,
      [Math.max(1, Math.min(1000, limit)), PROFILE_IDENTITY_MATCHER_VERSION],
    ),
    pool.query<ProfileUrlEvidence>(
      `select p.id as "profileId", p.name as "profileName", p.last_seen_at as "profileCheckedAt",
         p.website_url as url, 'official'::text as "aliasKind"
       from gary_profiles p where p.website_url is not null
       union all
       select p.id, p.name, p.last_seen_at, a.url, a.alias_kind
       from gary_profiles p join gary_profile_aliases a on a.profile_id = p.id
       where a.alias_kind in ('official', 'submission', 'alternate')`,
    ),
  ]);

  let decisionCount = 0;
  let confirmed = 0;
  let pending = 0;
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const opportunity of opportunityResult.rows) {
      const decisions = matchOpportunityToProfiles(opportunity, profileResult.rows);
      await persistDecisions(client, opportunity.opportunityId, decisions);
      decisionCount += decisions.length;
      confirmed += decisions.filter((decision) => decision.status === "confirmed").length;
      pending += decisions.filter((decision) => decision.status === "pending").length;
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return { opportunities: opportunityResult.rows.length, decisions: decisionCount, confirmed, pending };
}
