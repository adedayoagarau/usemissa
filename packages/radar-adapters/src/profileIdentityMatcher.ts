import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  createPostgresDecisionLedger,
  decide,
  decisionModeFromEnv,
  hostRelation,
  jevClientFromEnv,
  orgHostsOpportunity,
  profileOpportunityLinkState,
  type DecisionLedger,
  type DecisionMode,
  type DecisionOutcome,
  type JevClient,
  type Queryable,
} from "@missa/decisions";

export const PROFILE_IDENTITY_MATCHER_VERSION = "profile-host-name-v6";

/**
 * How recently a profile must have been crawled to confirm an identity. The
 * profile workers revisit each profile roughly monthly, and an organization's
 * website rarely changes, so 60 days keeps confirmations flowing without a person.
 */
export const PROFILE_FRESHNESS_DAYS = 60;

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
  organizationId?: string | null;
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
  /** "rejected" only comes from a live Jev decision on a pending link. */
  status: "pending" | "confirmed" | "rejected";
  confidence: number;
  matchedHost: string;
  opportunityUrl: string;
  profileUrl: string;
  nameScore: number;
  matchedNameTokens: string[];
  identityBasis: "call-name" | "exact-url";
  profileCheckedAt: string | null;
  opportunityCheckedAt: string | null;
  /** Set when a live Jev decision changed a pending link's status. */
  decidedBy?: string;
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
    const search = new URLSearchParams(url.search);
    for (const key of [...search.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) search.delete(key);
    }
    search.sort();
    const query = search.toString();
    return `${host}${pathname}${query ? `?${query}` : ""}`;
  } catch {
    return null;
  }
}

/** True when the page is the profile's own URL or sits beneath its path. */
function isAtOrUnderProfileUrl(pageUrl: string, profileUrl: string): boolean {
  try {
    const page = new URL(pageUrl.includes("://") ? pageUrl : `https://${pageUrl}`);
    const profile = new URL(profileUrl.includes("://") ? profileUrl : `https://${profileUrl}`);
    const profilePath = profile.pathname.replace(/\/+$/, "").toLowerCase();
    // A bare host is the shared platform itself, not one of its profiles.
    if (!profilePath) return false;
    const pagePath = page.pathname.replace(/\/+$/, "").toLowerCase();
    return pagePath === profilePath || pagePath.startsWith(`${profilePath}/`);
  } catch {
    return false;
  }
}

function isStrongCallNameEvidence(evidence: NameEvidence): boolean {
  return evidence.score >= 0.35 && (
    evidence.matchedTokens.length >= 2 ||
    evidence.matchedTokens.some((token) => token.length >= 6)
  );
}

function isNavigationOrListingRecord(title: string, value: string): boolean {
  const normalizedTitle = title.trim().toLowerCase();
  if (/^(rss\s+feed|submissions?|opportunities?)$/.test(normalizedTitle)) return true;
  if (/^[a-z][a-z\s-]*\s+\d+$/.test(normalizedTitle)) return true;
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\/?$/i.test(title.trim())) return true;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.searchParams.has("feed") || url.searchParams.has("tag")) return true;
    return /^\/(?:opportunities?|feed)\/?$/i.test(url.pathname);
  } catch {
    return true;
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

  // Direct organization link if opportunity.organizationId matches a known profile
  if (opportunity.organizationId) {
    const orgProfile = profileUrls.find((p) => p.profileId === opportunity.organizationId);
    if (orgProfile) {
      const matchedHost = normalizeHost(orgProfile.url) ?? "";
      decisions.set(`${orgProfile.profileId}:host`, {
        profileId: orgProfile.profileId,
        opportunityId: opportunity.opportunityId,
        relation: "host",
        status: "confirmed",
        confidence: 0.99,
        matchedHost,
        opportunityUrl: opportunity.sourceUrl ?? opportunity.guidelinesUrl ?? orgProfile.url,
        profileUrl: orgProfile.url,
        nameScore: 1,
        matchedNameTokens: [orgProfile.profileName],
        identityBasis: "exact-url",
        profileCheckedAt: orgProfile.profileCheckedAt,
        opportunityCheckedAt: opportunity.sourceCheckedAt,
      });
    }
  }

  for (const candidateUrl of opportunityUrls(opportunity)) {
    const host = normalizeHost(candidateUrl.url);
    if (!host) continue;
    const hostProfiles = byHost.get(host) ?? [];
    // Many profiles share a directory or social host (every ArtConnect profile
    // without its own website is stored as its artconnect.com page). There the
    // host says nothing about who owns a page, so only a page at or under a
    // profile's own URL can identify that profile.
    const isMultiTenantHost = new Set(hostProfiles.map((profile) => profile.profileId)).size > 3;
    const scored = hostProfiles.map((profile) => {
      const callName = profileNameEvidence(profile.profileName, context, host, false);
      const hostName = profileNameEvidence(profile.profileName, [], host, true);
      const exactUrl = normalizedIdentityUrl(candidateUrl.url) === normalizedIdentityUrl(profile.url);
      const strongCallName = isStrongCallNameEvidence(callName);
      const isNavigationRecord = isNavigationOrListingRecord(opportunity.title, candidateUrl.url);
      const ownsPage = !isMultiTenantHost || isAtOrUnderProfileUrl(candidateUrl.url, profile.url);
      const identityBasis: ProfileIdentityDecision["identityBasis"] =
        strongCallName ? "call-name" : "exact-url";
      return {
        profile,
        score: Math.max(callName.score, exactUrl ? hostName.score : 0),
        matchedTokens: strongCallName ? callName.matchedTokens : hostName.matchedTokens,
        identityBasis,
        ownsPage,
        hasCompatibleIdentity: !isNavigationRecord && ownsPage && (strongCallName || (exactUrl && hostName.score >= 0.75)),
      };
    });
    const bestByProfile = new Map<string, (typeof scored)[number]>();
    for (const candidate of scored) {
      const current = bestByProfile.get(candidate.profile.profileId);
      if (!current || (candidate.ownsPage && !current.ownsPage) ||
        (candidate.ownsPage === current.ownsPage && candidate.score > current.score)) {
        bestByProfile.set(candidate.profile.profileId, candidate);
      }
    }
    const unique = [...bestByProfile.values()].sort((left, right) => right.score - left.score);
    // A profile that does not own the page is no rival for one that does.
    const rivals = unique.filter((candidate) => candidate.ownsPage);
    const best = rivals[0];
    const runnerUp = rivals[1];

    for (const candidate of unique) {
      const isDirectOrgMatch = Boolean(opportunity.organizationId && opportunity.organizationId === candidate.profile.profileId);
      if (isMultiTenantHost && !isDirectOrgMatch && candidate.score === 0) {
        continue;
      }
      const freshOpportunity = !opportunity.sourceCheckedAt || isFresh(opportunity.sourceCheckedAt, 30, now);
      const freshProfile = isFresh(candidate.profile.profileCheckedAt, PROFILE_FRESHNESS_DAYS, now);
      const isUnambiguousBest = isDirectOrgMatch || (candidate === best && candidate.hasCompatibleIdentity &&
        (!runnerUp || candidate.score - runnerUp.score >= 0.15) && freshOpportunity && freshProfile);
      const key = `${candidate.profile.profileId}:${candidateUrl.relation}`;
      const decision: ProfileIdentityDecision = {
        profileId: candidate.profile.profileId,
        opportunityId: opportunity.opportunityId,
        relation: candidateUrl.relation,
        status: isUnambiguousBest ? "confirmed" : "pending",
        confidence: isDirectOrgMatch ? 0.99 : Number((0.7 + candidate.score * 0.3).toFixed(3)),
        matchedHost: host,
        opportunityUrl: candidateUrl.url,
        profileUrl: candidate.profile.url,
        nameScore: isDirectOrgMatch ? 1 : candidate.score,
        matchedNameTokens: candidate.matchedTokens,
        identityBasis: isDirectOrgMatch ? "exact-url" : candidate.identityBasis,
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

export function profileLinkRetirementStatement(opportunityId: string): {
  text: string;
  values: [string, string];
} {
  return {
    text: `update opportunity_profile_links
     set status = 'rejected', verified_at = now(), verified_until = null, updated_at = now(),
         evidence_json = evidence_json || jsonb_build_object('retiredBy', $2::text, 'retiredAt', now())
     where opportunity_id = $1 and evidence_json ->> 'matcherVersion' like 'profile-host-name-v%'`,
    values: [opportunityId, PROFILE_IDENTITY_MATCHER_VERSION],
  };
}

async function persistDecisions(client: PoolClient, opportunityId: string, decisions: ProfileIdentityDecision[]): Promise<void> {
  const retirement = profileLinkRetirementStatement(opportunityId);
  await client.query(retirement.text, retirement.values);
  for (const decision of decisions) {
    await client.query(
      `insert into opportunity_profile_links
         (id, opportunity_id, profile_id, relation, status, confidence, matched_host,
          opportunity_url, profile_url, name_score, matched_name_tokens, evidence_json,
          profile_checked_at, opportunity_checked_at, verified_at, verified_until)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         jsonb_build_object('matcherVersion', $12::text, 'rule', 'exact-host-plus-call-identity',
           'identityBasis', $13::text)
           || case when $16::text is null then '{}'::jsonb else jsonb_build_object('decidedBy', $16::text) end,
         $14, $15, now(), now() + interval '7 days')
       on conflict (profile_id, opportunity_id, relation) do update set
         status = excluded.status,
         confidence = excluded.confidence,
         matched_host = excluded.matched_host,
         opportunity_url = excluded.opportunity_url,
         profile_url = excluded.profile_url,
         name_score = excluded.name_score,
         matched_name_tokens = excluded.matched_name_tokens,
         evidence_json = excluded.evidence_json,
         profile_checked_at = excluded.profile_checked_at,
         opportunity_checked_at = excluded.opportunity_checked_at,
         verified_at = excluded.verified_at,
         verified_until = excluded.verified_until,
         updated_at = now()`,

      [
        linkId(decision), decision.opportunityId, decision.profileId, decision.relation,
        decision.status, decision.confidence, decision.matchedHost, decision.opportunityUrl,
        decision.profileUrl, decision.nameScore, decision.matchedNameTokens,
        PROFILE_IDENTITY_MATCHER_VERSION, decision.identityBasis,
        decision.profileCheckedAt, decision.opportunityCheckedAt,
        decision.decidedBy ?? null,
      ],
    );
  }
  const confirmedCount = decisions.filter((decision) => decision.status === "confirmed").length;
  // Only live Jev decisions reject a link; without them every decision is
  // pending or confirmed and this matches the matcher's original status rule.
  const pendingCount = decisions.filter((decision) => decision.status === "pending").length;
  const status = confirmedCount > 0 ? "confirmed" : pendingCount > 0 ? "pending" : "no-match";
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
  options: { jev?: ProfileIdentityJevOptions } = {},
): Promise<{ opportunities: number; decisions: number; confirmed: number; pending: number }> {
  const [opportunityResult, profileResult] = await Promise.all([
    pool.query<OpportunityIdentityInput>(
      `select o.id as "opportunityId", o.title,
         coalesce(org.data->>'name', latest_version.fields ->> 'organizationName') as "organizationName",
         o.organization_id as "organizationId",
         s.name as "sourceName",
         o.source_checked_at as "sourceCheckedAt", s.url as "sourceUrl",
         o.guidelines_url as "guidelinesUrl", o.submission_url as "submissionUrl"
       from opportunities o join opportunity_sources s on s.id = o.source_id
       left join radar_organizations org on org.id = o.organization_id
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
  // Jev runs before the transaction so no connection is held across network calls.
  const matched: Array<{ opportunity: OpportunityIdentityInput; decisions: ProfileIdentityDecision[] }> = [];
  let jevBudget = options.jev?.maxDecisions ?? 50;
  for (const opportunity of opportunityResult.rows) {
    let decisions = matchOpportunityToProfiles(opportunity, profileResult.rows);
    if (options.jev && jevBudget > 0 && decisions.some((decision) => decision.status === "pending")) {
      const adjudicated = await adjudicatePendingProfileLinks(opportunity, decisions, profileResult.rows, { ...options.jev, maxDecisions: jevBudget });
      jevBudget -= adjudicated.asked;
      decisions = adjudicated.decisions;
    }
    matched.push({ opportunity, decisions });
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const { opportunity, decisions } of matched) {
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

// ── Jev adjudication of pending links ─────────────────────────────────

export interface ProfileIdentityJevOptions {
  client: JevClient;
  ledger?: DecisionLedger;
  /** DECISIONS_MODE_PROFILE_IDENTITY; live lets confident answers confirm or reject pending links. */
  mode: DecisionMode;
  /** Upper bound on Jev calls per sync; one call per pending link. */
  maxDecisions?: number;
  logger?: Pick<Console, "warn">;
}

const COMPATIBLE_ROLES: Record<ProfileIdentityDecision["relation"], readonly string[]> = {
  host: ["organizer", "host"],
  submission: ["organizer", "host", "submission-platform"],
};

/** What a pair of Jev answers means for one pending link; only actionable (live) answers count. */
export function profileLinkActionFromJev(
  relation: ProfileIdentityDecision["relation"],
  hosts: DecisionOutcome | undefined,
  role: DecisionOutcome | undefined,
): "confirm" | "reject" | "keep" {
  const roleAnswer = role?.actionable === true && role.route === "apply" ? role.answer : null;
  const compatibleRole = roleAnswer !== null && COMPATIBLE_ROLES[relation].includes(roleAnswer);
  const hostsConfirmed = hosts?.actionable === true && hosts.route === "apply";
  const hostsRejected = hosts?.actionable === true && hosts.route === "reject";
  // A submission platform is not expected to host the call, so its role answer stands alone.
  if (compatibleRole && (hostsConfirmed || (relation === "submission" && roleAnswer === "submission-platform"))) return "confirm";
  if ((roleAnswer !== null && !compatibleRole) || (relation === "host" && hostsRejected)) return "reject";
  return "keep";
}

/**
 * Asks Jev org_hosts_opportunity and host_relation about each pending link of
 * one opportunity (highest confidence first, at most maxDecisions) and records
 * the answers. In live mode a confident answer may confirm or reject a pending
 * link. Links the matcher already confirmed are never touched, and when Jev
 * would confirm more than one profile for the same relation, or a relation
 * already has a confirmed link, the candidates stay pending for a person.
 */
export async function adjudicatePendingProfileLinks(
  opportunity: OpportunityIdentityInput,
  decisions: ProfileIdentityDecision[],
  profileUrls: ProfileUrlEvidence[],
  options: ProfileIdentityJevOptions,
): Promise<{ decisions: ProfileIdentityDecision[]; asked: number }> {
  const logger = options.logger ?? console;
  const profileNames = new Map(profileUrls.map((profile) => [profile.profileId, profile.profileName]));
  const pending = decisions
    .filter((decision) => decision.status === "pending")
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, Math.max(0, options.maxDecisions ?? 50));
  const actions = new Map<ProfileIdentityDecision, "confirm" | "reject" | "keep">();
  for (const decision of pending) {
    const otherProfiles = decisions
      .filter((other) => other.matchedHost === decision.matchedHost && other.profileId !== decision.profileId)
      .map((other) => profileNames.get(other.profileId));
    try {
      const result = await decide({
        client: options.client,
        ledger: options.ledger,
        mode: options.mode,
        subjectId: `${decision.opportunityId}~${decision.profileId}~${decision.relation}`,
        state: profileOpportunityLinkState({
          profile: { name: profileNames.get(decision.profileId) ?? null, url: decision.profileUrl },
          opportunity: {
            title: opportunity.title,
            organization: opportunity.organizationName,
            sourceUrl: opportunity.sourceUrl,
            guidelinesUrl: opportunity.guidelinesUrl,
            submissionUrl: opportunity.submissionUrl,
          },
          matchedHost: decision.matchedHost,
          otherProfiles,
        }),
        questions: [orgHostsOpportunity, hostRelation],
        evidenceUrl: decision.opportunityUrl,
      });
      if (result.error) logger.warn(`[profile-identity] Jev decision for ${decision.opportunityId}: ${result.error}`);
      actions.set(decision, profileLinkActionFromJev(decision.relation, result.outcomes[orgHostsOpportunity.key], result.outcomes[hostRelation.key]));
    } catch (error) {
      logger.warn(`[profile-identity] Jev decision failed for ${decision.opportunityId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const confirmations = new Map<string, number>();
  for (const [decision, action] of actions) {
    if (action === "confirm") confirmations.set(decision.relation, (confirmations.get(decision.relation) ?? 0) + 1);
  }
  const alreadyConfirmed = new Set(decisions.filter((decision) => decision.status === "confirmed").map((decision) => decision.relation));
  const next = decisions.map((decision): ProfileIdentityDecision => {
    const action = actions.get(decision);
    if (action === "reject") return { ...decision, status: "rejected", decidedBy: `jev:${orgHostsOpportunity.key}` };
    if (action === "confirm" && confirmations.get(decision.relation) === 1 && !alreadyConfirmed.has(decision.relation)) {
      return { ...decision, status: "confirmed", decidedBy: `jev:${orgHostsOpportunity.key}` };
    }
    return decision;
  });
  return { decisions: next, asked: pending.length };
}

/** Undefined unless JEV_API_KEY is set. Scope: DECISIONS_MODE_PROFILE_IDENTITY. */
export function profileIdentityJevFromEnv(
  db: Queryable,
  env: Record<string, string | undefined> = process.env,
): ProfileIdentityJevOptions | undefined {
  const client = jevClientFromEnv(env);
  if (!client.available) return undefined;
  const max = Number(env.JEV_PROFILE_IDENTITY_MAX_PER_SYNC);
  return {
    client,
    ledger: createPostgresDecisionLedger(db),
    mode: decisionModeFromEnv("profile_identity", env),
    maxDecisions: env.JEV_PROFILE_IDENTITY_MAX_PER_SYNC && Number.isFinite(max) && max >= 0 ? max : 50,
  };
}
