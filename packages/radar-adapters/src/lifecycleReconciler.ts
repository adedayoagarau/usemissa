import { parseDate } from "@missa/radar-engine";
import type { Pool } from "pg";
import { parseDisallowForUserAgent } from "./sourcePolicy.js";

export const LIFECYCLE_CLASSIFIER_VERSION = "lifecycle-source-v15";
export const DEFAULT_LIFECYCLE_BATCH_SIZE = 25;
export const MAX_LIFECYCLE_BATCH_SIZE = 100;

export type LifecycleDecision = {
  decision: "apply" | "review" | "retry";
  confidence: "high" | "medium" | "low";
  reason: string;
  evidencePassage?: string;
  status?: "opening-soon" | "open" | "paused" | "closed" | "archived" | "uncertain";
  openDate?: string;
  deadlineDate?: string;
  deadlineKind?: "exact" | "rolling" | "year-round" | "seasonal" | "until-filled";
  seasonLabel?: string;
};

type LifecycleJob = {
  opportunityId: string;
  title: string;
  sourceUrl: string | null;
  guidelinesUrl: string | null;
  submissionUrl: string | null;
  publicationState: string;
};

export type LifecycleFetchResult =
  | { status: "ok"; text: string; finalUrl?: string; sourceDate?: string }
  | { status: "gone" | "error"; error?: string };

export type LifecycleReconcilerOptions = {
  batchSize?: number;
  now?: Date;
  fetchPage?: (url: string) => Promise<LifecycleFetchResult>;
  logger?: Pick<Console, "info" | "warn">;
};

const CLOSED = /\b(?:submissions?|applications?|the call|this call)\s+(?:are|is|has)\s+(?:now\s+)?closed\b|\b(?:submissions?|applications?)\s+have\s+closed\b|\bnot currently accepting\b/i;
const PAUSED = /\b(?:submissions?|applications?|the program|the call)\s+(?:are|is)\s+(?:temporarily\s+)?paused\b|\btemporarily not accepting\b/i;
const ARCHIVED = /\b(?:program|opportunity|award|grant)\s+(?:has been|is)\s+(?:discontinued|retired|archived)\b|\bno longer (?:offered|available)\b/i;
const YEAR_ROUND = /\b(?:open|accept(?:ing|s)?)\s+(?:submissions?|applications?)\s+(?:all|year)[ -]?round\b|\bsubmissions? (?:are )?open year[ -]?round\b/i;
const ROLLING = /\b(?:accept(?:ing|s?)|open for)\s+(?:submissions?|applications?)\s+on a rolling basis\b|\b(?:submissions?|applications?)\s+(?:are\s+)?accepted on a rolling basis\b|\brolling (?:submissions?|applications?|deadline)\b/i;
const UNTIL_FILLED = /\b(?:open|available|applications? accepted)\s+until (?:filled|funds? (?:are )?exhausted)\b|\buntil filled\b/i;
const OPEN = /\b(?:submissions?|applications?)\s+(?:are|is)\s+(?:now\s+)?open\b|\bnow accepting (?:submissions?|applications?)\b/i;
const APPLY_NOW = /\bapply now\b/i;
const OPENING = /\b(?:submissions?|applications?|the call|reading period)\s+(?:will\s+)?open(?:s|ing)?(?:\s+on)?\b|\b(?:applicant )?registration begins?\b/i;
const DEADLINE = /\b(?:deadline|closes?(?: on)?|submissions? close|applications? (?:are )?due|due by)[^.!?\n]{0,100}/i;
const SEASON = /\b(spring|summer|autumn|fall|winter)(?:\s+(20\d{2}))?\b/i;

function passage(text: string, match: RegExpExecArray | null): string | undefined {
  if (!match) return undefined;
  const start = Math.max(0, match.index - 90);
  const end = Math.min(text.length, match.index + match[0].length + 120);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 500);
}

function explicitDateInClause(text: string, pattern: RegExp, now: Date): { date: string; passage: string } | undefined {
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const match = pattern.exec(text.slice(searchFrom));
    if (!match) return undefined;
    const matchIndex = searchFrom + match.index;
    const clause = text.slice(matchIndex, Math.min(text.length, matchIndex + 180));
    const parsed = parseDate(clause, now);
    if (parsed && !parsed.yearInferred) {
      const start = Math.max(0, matchIndex - 90);
      const end = Math.min(text.length, matchIndex + match[0].length + 120);
      return { date: parsed.date, passage: text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 500) };
    }
    searchFrom = matchIndex + Math.max(1, match[0].length);
  }
  return undefined;
}

type LifecycleEvidenceContext = { title?: string; sourceUrl?: string };

const AGGREGATE_TITLE = /^(?:next\s*(?:-|&gt;|→)*|artconnect page \d+|opportunities without fees|art contests|opportunities for artists in .+|[^,]+,\s*[A-Z]{2},\s*[^,]+)$/i;
const AGGREGATE_PAGE_FURNITURE = /\brolling deadline\s+\d+\s+opportunities\b|\bsort:\s*deadline\s+soonest\b|\bpopular filters\b[\s\S]{0,240}\brolling deadline\b/i;

function isAggregateLifecycleEvidence(text: string, context: LifecycleEvidenceContext): boolean {
  if (context.title && AGGREGATE_TITLE.test(context.title.trim())) return true;
  if (AGGREGATE_PAGE_FURNITURE.test(text)) return true;
  if (!context.sourceUrl) return false;
  try {
    const url = new URL(context.sourceUrl.replace(/&amp;/g, "&"));
    if (url.hostname === "www.artconnect.com") {
      return url.pathname === "/opportunities"
        && [...url.searchParams.keys()].some((key) => ["page", "country", "state", "city", "sortBy"].includes(key));
    }
    if (url.hostname === "artdeadline.com") return url.pathname === "/" || /^\/ops-(?:tag|category)\//.test(url.pathname);
    if (url.hostname === "opencallradar.com") return /^\/open-calls\/monthly\//.test(url.pathname);
    if (url.hostname === "openartsforum.com" || url.hostname === "www.openartsforum.com") {
      return url.pathname === "/opportunities/" && url.searchParams.has("tag");
    }
    if (url.hostname === "on-the-move.org" || url.hostname === "www.on-the-move.org") {
      return url.pathname.replace(/\/$/, "") === "/news/deadlines"
        || /^\/resources\/funding(?:\/|$)/.test(url.pathname);
    }
    if (url.hostname === "curatorspace.com" || url.hostname === "www.curatorspace.com") {
      return /^\/opportunities\/index(?:\/|$)/.test(url.pathname);
    }
    if (url.hostname === "transartists.org" || url.hostname === "www.transartists.org") {
      return /^\/en\/air\//.test(url.pathname)
        || /^\/en\/(?:deadlines|transartists-calls)\/?$/.test(url.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

const GENERIC_TITLE_WORDS = new Set(["open", "call", "application", "applications", "deadline", "award", "awards", "artist", "artists", "project", "program", "fellowship", "applicant", "applicants"]);

function deadlineBelongsToTitle(evidence: string, title: string | undefined): boolean {
  if (!title) return true;
  const words = [...new Set((title.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => word.length >= 5 && !GENERIC_TITLE_WORDS.has(word)))];
  if (words.length === 0) return false;
  const normalizedEvidence = evidence.toLocaleLowerCase();
  const matches = words.filter((word) => normalizedEvidence.includes(word)).length;
  return matches >= Math.min(2, words.length);
}

function isArtConnectOpportunityDetail(sourceUrl: string | undefined): boolean {
  if (!sourceUrl) return false;
  try {
    const url = new URL(sourceUrl.replace(/&amp;/g, "&"));
    return /^(?:www\.)?artconnect\.com$/i.test(url.hostname)
      && /^\/opportunity\/[^/]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function isPoetsAndWritersContestDetail(sourceUrl: string | undefined): boolean {
  if (!sourceUrl) return false;
  try {
    const url = new URL(sourceUrl.replace(/&amp;/g, "&"));
    return /^(?:www\.)?pw\.org$/i.test(url.hostname)
      && /^\/writing_contests\/[^/]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function pageContainsTitle(text: string, title: string | undefined): boolean {
  if (!title) return false;
  return text.toLocaleLowerCase().includes(title.trim().toLocaleLowerCase());
}

export function classifyLifecycleEvidence(text: string, now = new Date(), context: LifecycleEvidenceContext = {}): LifecycleDecision {
  const bounded = text.slice(0, 500_000);
  if (isAggregateLifecycleEvidence(bounded, context)) {
    return {
      decision: "review",
      confidence: "low",
      reason: "Aggregate directory or navigation page is not opportunity-specific lifecycle evidence.",
    };
  }
  const closed = CLOSED.exec(bounded);
  const paused = PAUSED.exec(bounded);
  const archived = ARCHIVED.exec(bounded);
  const yearRound = YEAR_ROUND.exec(bounded);
  const rolling = ROLLING.exec(bounded);
  const untilFilled = UNTIL_FILLED.exec(bounded);
  const open = OPEN.exec(bounded);
  const applyNow = APPLY_NOW.exec(bounded);
  const openingDate = explicitDateInClause(bounded, OPENING, now);
  const deadline = explicitDateInClause(bounded, DEADLINE, now);
  const today = now.toISOString().slice(0, 10);
  const activeSignals = [yearRound, rolling, untilFilled, open, openingDate].filter(Boolean).length;
  const inactiveSignals = [closed, paused, archived].filter(Boolean).length;

  if (activeSignals && inactiveSignals) {
    return { decision: "review", confidence: "low", reason: "Source contains conflicting open and closed lifecycle statements.", evidencePassage: passage(bounded, closed ?? paused ?? archived) };
  }
  if (archived) return { decision: "apply", confidence: "high", reason: "Source explicitly says the opportunity is discontinued or archived.", evidencePassage: passage(bounded, archived), status: "archived" };
  if (paused) return { decision: "apply", confidence: "high", reason: "Source explicitly says intake is temporarily paused.", evidencePassage: passage(bounded, paused), status: "paused" };
  if (closed) {
    const evidencePassage = passage(bounded, closed);
    const season = evidencePassage ? SEASON.exec(evidencePassage) : null;
    const seasonLabel = season ? `${season[1][0]!.toUpperCase()}${season[1].slice(1).toLowerCase()}${season[2] ? ` ${season[2]}` : ""}` : undefined;
    return { decision: "apply", confidence: "high", reason: "Source explicitly says the current intake is closed.", evidencePassage, status: "closed", ...(seasonLabel ? { seasonLabel } : {}) };
  }
  if (yearRound) return { decision: "apply", confidence: "high", reason: "Source explicitly accepts submissions year-round.", evidencePassage: passage(bounded, yearRound), status: "open", deadlineKind: "year-round" };
  if (rolling) return { decision: "apply", confidence: "high", reason: "Source explicitly accepts submissions on a rolling basis.", evidencePassage: passage(bounded, rolling), status: "open", deadlineKind: "rolling" };
  if (untilFilled) return { decision: "apply", confidence: "high", reason: "Source explicitly accepts applications until filled or funds are exhausted.", evidencePassage: passage(bounded, untilFilled), status: "open", deadlineKind: "until-filled" };
  if (openingDate && openingDate.date > today) return { decision: "apply", confidence: "high", reason: "Source states an explicit future opening date.", evidencePassage: openingDate.passage, status: "opening-soon", openDate: openingDate.date };
  if (deadline && deadline.date >= today && open) return { decision: "apply", confidence: "high", reason: "Source says intake is open and states a current explicit deadline.", evidencePassage: deadline.passage, status: "open", deadlineDate: deadline.date, deadlineKind: "exact" };
  if (deadline && deadline.date >= today && applyNow && isArtConnectOpportunityDetail(context.sourceUrl) && deadlineBelongsToTitle(deadline.passage, context.title)) return { decision: "apply", confidence: "high", reason: "The ArtConnect opportunity detail page offers an application action and states a current title-aligned deadline.", evidencePassage: deadline.passage, status: "open", deadlineDate: deadline.date, deadlineKind: "exact" };
  if (deadline && isPoetsAndWritersContestDetail(context.sourceUrl) && pageContainsTitle(bounded, context.title)) return deadline.date >= today
    ? { decision: "apply", confidence: "high", reason: "The canonical Poets & Writers contest page states a current explicit deadline.", evidencePassage: deadline.passage, status: "open", deadlineDate: deadline.date, deadlineKind: "exact" }
    : { decision: "apply", confidence: "high", reason: "The freshly fetched canonical Poets & Writers contest page states an explicit deadline that has passed.", evidencePassage: deadline.passage, status: "closed", deadlineDate: deadline.date, deadlineKind: "exact" };
  if (deadline && deadline.date < today && activeSignals === 0 && deadlineBelongsToTitle(deadline.passage, context.title)) return { decision: "apply", confidence: "high", reason: "The freshly fetched source states an explicit deadline that has passed and no active intake mode.", evidencePassage: deadline.passage, status: "closed", deadlineDate: deadline.date, deadlineKind: "exact" };
  if (open || openingDate) return { decision: "review", confidence: "medium", reason: "Source suggests intake is open but lacks an unambiguous current window.", evidencePassage: passage(bounded, open) ?? openingDate?.passage };
  return { decision: "review", confidence: "low", reason: "No explicit current lifecycle statement was found." };
}

function boundedBatchSize(value: number | undefined): number {
  if (!Number.isInteger(value) || (value ?? 0) < 1) return DEFAULT_LIFECYCLE_BATCH_SIZE;
  return Math.min(value!, MAX_LIFECYCLE_BATCH_SIZE);
}

async function defaultFetchPage(url: string): Promise<LifecycleFetchResult> {
  try {
    const userAgent = "MissaRadar/0.1 (+https://usemissa.com/radar)";
    const parsedUrl = new URL(url);
    const robots = await fetch(`${parsedUrl.origin}/robots.txt`, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(5_000) }).catch(() => null);
    if (robots?.ok) {
      const disallowed = parseDisallowForUserAgent(await robots.text(), userAgent);
      if (disallowed.some((prefix) => parsedUrl.pathname.startsWith(prefix))) return { status: "error", error: "robots-blocked" };
    }
    const response = await fetch(url, {
      headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml,text/plain;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404 || response.status === 410) return { status: "gone" };
    if (response.status === 202) return { status: "error", error: "challenge-response-202" };
    if (!response.ok) return { status: "error", error: `http-${response.status}` };
    const type = response.headers.get("content-type") ?? "";
    if (!/(?:text\/html|application\/xhtml\+xml|text\/plain)/i.test(type)) return { status: "error", error: "unsupported-content-type" };
    const text = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
    if (text.trim().length < 80) return { status: "error", error: "empty-or-challenge-content" };
    const modified = response.headers.get("last-modified");
    const parsedModified = modified ? new Date(modified) : null;
    return {
      status: "ok",
      text,
      finalUrl: response.url,
      sourceDate: parsedModified && Number.isFinite(parsedModified.getTime())
        ? parsedModified.toISOString().slice(0, 10)
        : undefined,
    };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.name : "network" };
  }
}

async function claimJobs(pool: Pool, batchSize: number): Promise<LifecycleJob[]> {
  const result = await pool.query<LifecycleJob>(`
    with due as (
      select j.opportunity_id
      from opportunity_lifecycle_verification_jobs j
      where (j.status in ('pending','retry') and j.next_check_at <= now())
         or (j.status = 'processing' and j.locked_at < now() - interval '20 minutes')
      order by j.priority desc, j.next_check_at, j.opportunity_id
      for update skip locked
      limit $1
    ), claimed as (
      update opportunity_lifecycle_verification_jobs j
      set status='processing', locked_at=now(), attempts=j.attempts+1, updated_at=now()
      from due where j.opportunity_id=due.opportunity_id
      returning j.opportunity_id
    )
    select o.id as "opportunityId", o.title, s.url as "sourceUrl", o.guidelines_url as "guidelinesUrl",
           o.submission_url as "submissionUrl", o.publication_state as "publicationState"
    from claimed c join opportunities o on o.id=c.opportunity_id
    left join opportunity_sources s on s.id=o.source_id
    order by case when o.publication_state='published' then 0 else 1 end, o.id
  `, [batchSize]);
  return result.rows;
}

function urlCandidates(job: LifecycleJob): string[] {
  return [...new Set([job.guidelinesUrl, job.sourceUrl, job.submissionUrl].filter((value): value is string => Boolean(value)))];
}

function scopeToOpportunity(text: string, title: string): string | null {
  if (text.length <= 20_000) return text;
  const index = text.toLocaleLowerCase().indexOf(title.trim().toLocaleLowerCase());
  if (index < 0) return null;
  return text.slice(Math.max(0, index - 4_000), Math.min(text.length, index + title.length + 8_000));
}

function nextInterval(decision: LifecycleDecision): string {
  if (decision.status === "opening-soon") return "1 day";
  if (decision.status === "open" && decision.deadlineKind === "exact") return "1 day";
  if (decision.status === "open") return "30 days";
  if (decision.status === "closed") return "30 days";
  if (decision.status === "paused") return "14 days";
  if (decision.status === "archived") return "180 days";
  return "7 days";
}

export const LIFECYCLE_APPLY_SQL = `
  update opportunities set status=$2,
    open_date=coalesce($3::date,open_date), deadline_date=coalesce($4::date,deadline_date),
    deadline_kind=case
      when $5='exact' and deadline_date is not distinct from $4::date and deadline_kind='date' then deadline_kind
      else coalesce($5,deadline_kind)
    end,
    source_checked_at=$6,
    last_changed_at=case when publication_state='reviewable' then now() else last_changed_at end,
    updated_at=now()
  where id=$1
`;

async function recordDecision(pool: Pool, job: LifecycleJob, sourceUrl: string, fetchedAt: Date, sourceDate: string | undefined, decision: LifecycleDecision): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`
      insert into opportunity_lifecycle_evidence
        (opportunity_id,source_url,fetched_at,source_date,classifier_version,decision,confidence,evidence_passage,
         proposed_status,proposed_open_date,proposed_deadline_date,proposed_deadline_kind,metadata)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
  `, [job.opportunityId, sourceUrl, fetchedAt, sourceDate ? sourceDate.slice(0, 10) : null, LIFECYCLE_CLASSIFIER_VERSION, decision.decision, decision.confidence, decision.evidencePassage ?? null, decision.status ?? null, decision.openDate ?? null, decision.deadlineDate ?? null, decision.deadlineKind ?? null, JSON.stringify({ reason: decision.reason, ...(decision.seasonLabel ? { seasonLabel: decision.seasonLabel } : {}) })]);

    if (decision.decision === "apply" && decision.confidence === "high" && decision.status) {
      await client.query(LIFECYCLE_APPLY_SQL, [job.opportunityId, decision.status, decision.openDate ?? null, decision.deadlineDate ?? null, decision.deadlineKind ?? null, fetchedAt]);
      if (decision.status === "closed" && decision.seasonLabel) {
        await client.query(`
          insert into opportunity_call_profiles
            (opportunity_id,reading_period_kind,reading_period_label,confidence,source_url,last_verified_at)
          values ($1,'seasonal',$2,'confirmed',$3,$4)
          on conflict (opportunity_id) do update set
            reading_period_kind='seasonal',reading_period_label=excluded.reading_period_label,
            confidence='confirmed',source_url=excluded.source_url,last_verified_at=excluded.last_verified_at,updated_at=now()
        `, [job.opportunityId, decision.seasonLabel, sourceUrl, fetchedAt]);
      }
      await client.query(`update opportunity_lifecycle_verification_jobs set status='pending', locked_at=null,
        last_checked_at=$2::timestamptz,last_error=null,next_check_at=$2::timestamptz + $3::interval,updated_at=now() where opportunity_id=$1`, [job.opportunityId, fetchedAt, nextInterval(decision)]);
    } else if (decision.decision === "review" && decision.confidence === "low") {
      await client.query(`update opportunity_lifecycle_verification_jobs set status='pending', locked_at=null,
        last_checked_at=$2,last_error=$3,next_check_at=$2::timestamptz + interval '30 days',updated_at=now()
        where opportunity_id=$1`, [job.opportunityId, fetchedAt, decision.reason.slice(0, 500)]);
    } else {
      await client.query(`update opportunity_lifecycle_verification_jobs set status='review', locked_at=null,
        last_checked_at=$2,last_error=$3,updated_at=now() where opportunity_id=$1`, [job.opportunityId, fetchedAt, decision.reason.slice(0, 500)]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function recordRetry(pool: Pool, job: LifecycleJob, error: string): Promise<void> {
  await pool.query(`update opportunity_lifecycle_verification_jobs set status='retry',locked_at=null,
    last_checked_at=now(),last_error=$2,next_check_at=now() + least(attempts,12) * interval '2 hours',updated_at=now()
    where opportunity_id=$1`, [job.opportunityId, error.slice(0, 500)]);
}

export async function runLifecycleReconcilerBatch(pool: Pool, options: LifecycleReconcilerOptions = {}): Promise<{ claimed: number; applied: number; review: number; deferred: number; retry: number }> {
  const jobs = await claimJobs(pool, boundedBatchSize(options.batchSize));
  const fetchPage = options.fetchPage ?? defaultFetchPage;
  const now = options.now ?? new Date();
  const totals = { claimed: jobs.length, applied: 0, review: 0, deferred: 0, retry: 0 };
  for (const job of jobs) {
    let handled = false;
    for (const url of urlCandidates(job)) {
      const result = await fetchPage(url);
      if (result.status !== "ok") continue;
      const scopedText = scopeToOpportunity(result.text, job.title);
      const decision = scopedText
        ? classifyLifecycleEvidence(scopedText, now, { title: job.title, sourceUrl: result.finalUrl ?? url })
        : { decision: "review", confidence: "low", reason: "Large source page could not be scoped to this opportunity title." } satisfies LifecycleDecision;
      try {
        await recordDecision(pool, job, result.finalUrl ?? url, now, result.sourceDate, decision);
        totals[decision.decision === "apply" ? "applied" : decision.confidence === "low" ? "deferred" : "review"] += 1;
      } catch (error) {
        await recordRetry(pool, job, error instanceof Error ? error.message : "database-transition-failed");
        totals.retry += 1;
      }
      handled = true;
      break;
    }
    if (!handled) {
      await recordRetry(pool, job, "No lifecycle source could be fetched.");
      totals.retry += 1;
    }
  }
  options.logger?.info(`[missa-lifecycle-reconciler] ${JSON.stringify(totals)}`);
  return totals;
}
