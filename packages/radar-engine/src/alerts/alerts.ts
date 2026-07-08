import type {
  Alert,
  AlertKind,
  Opportunity,
  OpportunityChange,
  Organization,
} from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';
import { daysBetween, isoDateOf } from '../extraction/dates.js';
import { confidenceTier } from '../status/statusEngine.js';
import type { MatchResult } from '../matching/matching.js';

export interface AlertContext {
  store: RadarStore;
  ids: IdGenerator;
  clock: Clock;
}

/** Emit once per dedup key — "submitters receive noisy alerts" is a named Radar risk. */
function emit(
  ctx: AlertContext,
  dedupKey: string,
  alert: Omit<Alert, 'id' | 'createdAt' | 'read'>,
): Alert | undefined {
  if (ctx.store.emittedAlertKeys.has(dedupKey)) return undefined;
  ctx.store.emittedAlertKeys.add(dedupKey);
  const full: Alert = {
    ...alert,
    id: ctx.ids.next('alert'),
    createdAt: ctx.clock.now().toISOString(),
    read: false,
  };
  ctx.store.alerts.set(full.id, full);
  return full;
}

/** Users who should hear about this opportunity: trackers (with notify on) and org followers. */
function interestedUsers(store: RadarStore, opp: Opportunity): Map<string, string> {
  const users = new Map<string, string>(); // userId -> reason
  for (const t of store.tracked) {
    if (t.opportunityId === opp.id && t.notify) users.set(t.userId, 'you track this opportunity');
  }
  if (opp.fields.organizationId) {
    for (const f of store.follows) {
      if (f.organizationId === opp.fields.organizationId && !users.has(f.userId)) {
        users.set(f.userId, 'you follow this organization');
      }
    }
  }
  return users;
}

const CHANGE_ALERTS: Partial<Record<OpportunityChange['kind'], { kind: AlertKind; title: (o: Opportunity, c: OpportunityChange) => string }>> = {
  'deadline-extended': {
    kind: 'deadline-extended',
    title: (o, c) => `Deadline extended: ${o.fields.title} moved from ${c.oldValue} to ${c.newValue}`,
  },
  'deadline-changed': {
    kind: 'deadline-changed',
    title: (o, c) => `Deadline changed: ${o.fields.title} is now due ${c.newValue}`,
  },
  'fee-changed': {
    kind: 'fee-changed',
    title: (o, c) => `Fee changed: ${o.fields.title} (${c.oldValue ?? 'unknown'} → ${c.newValue ?? 'unknown'})`,
  },
  'eligibility-changed': {
    kind: 'eligibility-changed',
    title: (o) => `Possible change detected: the eligibility section of ${o.fields.title} changed. Review before submitting.`,
  },
  'call-closed': {
    kind: 'call-closed',
    title: (o) => `Closed: ${o.fields.title} is no longer accepting submissions`,
  },
  'call-reopened': {
    kind: 'call-reopened',
    title: (o) => `Reopened: ${o.fields.title} is accepting submissions again`,
  },
  'page-gone': {
    kind: 'page-gone',
    title: (o) => `Heads up: the page for ${o.fields.title} has disappeared`,
  },
};

export function alertChanges(ctx: AlertContext, changes: OpportunityChange[]): Alert[] {
  const out: Alert[] = [];
  for (const change of changes) {
    const mapping = CHANGE_ALERTS[change.kind];
    if (!mapping) continue;
    const opp = ctx.store.opportunities.get(change.opportunityId);
    if (!opp) continue;
    for (const [userId, reason] of interestedUsers(ctx.store, opp)) {
      const alert = emit(ctx, `${change.id}:${userId}`, {
        audience: 'user',
        userId,
        kind: mapping.kind,
        opportunityId: opp.id,
        title: mapping.title(opp, change),
        body: `Detected by Missa Radar from ${opp.sourceUrl}.`,
        reason,
      });
      if (alert) out.push(alert);
    }
  }
  return out;
}

export function alertMatches(ctx: AlertContext, matches: MatchResult[]): Alert[] {
  const out: Alert[] = [];
  for (const m of matches) {
    const alert = emit(ctx, `match:${m.profile.id}:${m.opportunity.id}`, {
      audience: 'user',
      userId: m.profile.userId,
      kind: 'new-match',
      opportunityId: m.opportunity.id,
      title: `New for you: ${m.opportunity.fields.title}`,
      body: `${m.opportunity.fields.organizationName ?? 'Unknown organization'} — status: ${m.opportunity.status}.`,
      reason: `matches your saved search "${m.profile.name}" (${m.matchedOn.join('; ')})`,
    });
    if (alert) out.push(alert);
  }
  return out;
}

/** Deadline/opening proximity + predicted reopen alerts for interested users. */
export function alertTimeSensitive(ctx: AlertContext): Alert[] {
  const out: Alert[] = [];
  const now = ctx.clock.now();
  const today = isoDateOf(now);
  for (const opp of ctx.store.opportunities.values()) {
    if (opp.duplicateOfId) continue;
    const users = interestedUsers(ctx.store, opp);
    if (users.size === 0) continue;

    if (opp.status === 'closing-soon' && opp.fields.deadline.date) {
      const days = daysBetween(today, opp.fields.deadline.date);
      const unconfirmed = confidenceTier(opp) === 'uncertain';
      // Confidence gate: don't push a hard same-day alert on data we don't trust yet.
      if (unconfirmed && days <= 0) continue;
      for (const [userId, reason] of users) {
        const alert = emit(ctx, `closing:${opp.id}:${opp.fields.deadline.date}:${userId}`, {
          audience: 'user',
          userId,
          kind: 'closing-soon',
          opportunityId: opp.id,
          title: `Closing soon${unconfirmed ? ' (unconfirmed)' : ''}: ${opp.fields.title} ${unconfirmed ? 'may close' : 'closes'} in ${days} day${days === 1 ? '' : 's'}`,
          body: unconfirmed ? `Deadline: ${opp.fields.deadline.date} (low-confidence — verify on their site).` : `Deadline: ${opp.fields.deadline.date}.`,
          reason,
        });
        if (alert) out.push(alert);
      }
    }

    if (opp.status === 'opening-soon' && opp.fields.openDate) {
      for (const [userId, reason] of users) {
        const alert = emit(ctx, `opening:${opp.id}:${opp.fields.openDate}:${userId}`, {
          audience: 'user',
          userId,
          kind: 'opening-soon',
          opportunityId: opp.id,
          title: `Opening soon: ${opp.fields.title} opens ${opp.fields.openDate}`,
          body: `Missa will keep checking the page.`,
          reason,
        });
        if (alert) out.push(alert);
      }
    }

    // Predicted reopen: notify ~2 weeks before the expected window (strategy § 9B).
    if (opp.prediction) {
      const daysToWindow = daysBetween(today, opp.prediction.expectedOpenStart);
      if (daysToWindow >= 0 && daysToWindow <= 14) {
        for (const [userId, reason] of users) {
          const alert = emit(ctx, `reopen:${opp.id}:${opp.prediction.expectedOpenStart}:${userId}`, {
            audience: 'user',
            userId,
            kind: 'expected-reopen',
            opportunityId: opp.id,
            title: `Expected to reopen: ${opp.fields.title} usually opens around ${opp.prediction.expectedOpenStart}`,
            body: `Prediction confidence: ${opp.prediction.confidence} (based on ${opp.prediction.basedOnCycles} past cycles). Missa will check daily.`,
            reason,
          });
          if (alert) out.push(alert);
        }
      }
    }
  }
  return out;
}

/** New call from a followed organization. */
export function alertFollowedOrgNewCalls(ctx: AlertContext, newOpportunities: Opportunity[]): Alert[] {
  const out: Alert[] = [];
  for (const opp of newOpportunities) {
    if (!opp.fields.organizationId || opp.duplicateOfId) continue;
    for (const f of ctx.store.follows) {
      if (f.organizationId !== opp.fields.organizationId) continue;
      const org = ctx.store.organizations.get(f.organizationId);
      const alert = emit(ctx, `follow-new:${opp.id}:${f.userId}`, {
        audience: 'user',
        userId: f.userId,
        kind: 'followed-org-new-call',
        opportunityId: opp.id,
        title: `${org?.name ?? 'An organization you follow'} posted a new call: ${opp.fields.title}`,
        body: `Status: ${opp.status}.`,
        reason: 'you follow this organization',
      });
      if (alert) out.push(alert);
    }
  }
  return out;
}

/**
 * Organization-side loop: Radar found a call on the org's own domain that the
 * org hasn't claimed — invite them to claim it (strategy § 17).
 */
export function alertClaimInvites(ctx: AlertContext): Alert[] {
  const out: Alert[] = [];
  for (const opp of ctx.store.opportunities.values()) {
    if (opp.duplicateOfId || opp.claimedByOrganizationId) continue;
    const org = matchOrganizationByDomain(ctx.store, opp.sourceUrl);
    if (!org) continue;
    if (!opp.fields.organizationId) opp.fields.organizationId = org.id;
    const alert = emit(ctx, `claim-invite:${opp.id}:${org.id}`, {
      audience: 'organization',
      organizationId: org.id,
      kind: 'claim-invite',
      opportunityId: opp.id,
      title: `Missa found an open call on your website: ${opp.fields.title}`,
      body: 'Claim it to update details, receive submissions through Missa, track analytics, add reviewers, and send decisions.',
      reason: `discovered at ${opp.sourceUrl}, which matches your domain`,
    });
    if (alert) out.push(alert);
  }
  return out;
}

export function matchOrganizationByDomain(store: RadarStore, url: string): Organization | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
  for (const org of store.organizations.values()) {
    if (org.domains.some((d) => host === d || host.endsWith(`.${d}`))) return org;
  }
  return undefined;
}

/** The Opportunity Inbox digest (strategy § 28): grouped, each item with its reason. */
export interface InboxDigest {
  userId: string;
  newForYou: Alert[];
  openingSoon: Alert[];
  closingSoon: Alert[];
  recentlyUpdated: Alert[];
  fromFollowedOrgs: Alert[];
  summary: string;
}

export function buildInboxDigest(store: RadarStore, userId: string): InboxDigest {
  const mine = [...store.alerts.values()].filter((a) => a.userId === userId && a.audience === 'user');
  const byKind = (kinds: AlertKind[]) => mine.filter((a) => kinds.includes(a.kind));
  const digest: InboxDigest = {
    userId,
    newForYou: byKind(['new-match']),
    openingSoon: byKind(['opening-soon', 'expected-reopen']),
    closingSoon: byKind(['closing-soon']),
    recentlyUpdated: byKind(['deadline-extended', 'deadline-changed', 'fee-changed', 'eligibility-changed', 'call-reopened', 'call-closed', 'page-gone']),
    fromFollowedOrgs: byKind(['followed-org-new-call']),
    summary: '',
  };
  const parts: string[] = [];
  const total = mine.length;
  parts.push(`Missa Radar found ${total} update${total === 1 ? '' : 's'} for you:`);
  if (digest.newForYou.length) parts.push(`${digest.newForYou.length} new match${digest.newForYou.length === 1 ? '' : 'es'}`);
  if (digest.closingSoon.length) parts.push(`${digest.closingSoon.length} closing soon`);
  if (digest.openingSoon.length) parts.push(`${digest.openingSoon.length} opening soon or expected to reopen`);
  if (digest.recentlyUpdated.length) parts.push(`${digest.recentlyUpdated.length} updated since you saved them`);
  if (digest.fromFollowedOrgs.length) parts.push(`${digest.fromFollowedOrgs.length} from organizations you follow`);
  digest.summary = parts.join('\n');
  return digest;
}
