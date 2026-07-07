import type { Opportunity, VerificationReason, VerificationTask } from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';
import { NEEDS_VERIFICATION_CONFIDENCE } from '../status/statusEngine.js';
import { STALE_FRESHNESS_THRESHOLD } from '../scoring/scores.js';

export interface VerificationContext {
  store: RadarStore;
  ids: IdGenerator;
  clock: Clock;
}

function openTaskExists(store: RadarStore, opportunityId: string, reason: VerificationReason): boolean {
  for (const t of store.verificationTasks.values()) {
    if (t.opportunityId === opportunityId && t.reason === reason && t.status === 'open') return true;
  }
  return false;
}

export function openTask(
  ctx: VerificationContext,
  reason: VerificationReason,
  details: string,
  opportunityId?: string,
): VerificationTask | undefined {
  if (opportunityId && openTaskExists(ctx.store, opportunityId, reason)) return undefined;
  const id = ctx.ids.next('vtask');
  const task: VerificationTask = {
    id,
    opportunityId,
    reason,
    details,
    createdAt: ctx.clock.now().toISOString(),
    status: 'open',
  };
  ctx.store.verificationTasks.set(id, task);
  return task;
}

/**
 * Sweep after scoring/status: open human-verification tasks for anything the
 * engine is not sure about (strategy: "Human QA — internal verification queue").
 */
export function sweepForVerification(ctx: VerificationContext): VerificationTask[] {
  const created: VerificationTask[] = [];
  const push = (t: VerificationTask | undefined) => t && created.push(t);
  for (const opp of ctx.store.opportunities.values()) {
    if (opp.status === 'archived' || opp.duplicateOfId) continue;
    if (opp.conflicts.length > 0) {
      push(openTask(ctx, 'conflicting-data', `Conflicting data for "${opp.fields.title}": ${opp.conflicts.join(' | ')}`, opp.id));
    }
    if (opp.scores.confidence < NEEDS_VERIFICATION_CONFIDENCE && !opp.claimedByOrganizationId) {
      push(openTask(ctx, 'low-confidence', `Extraction confidence ${opp.scores.confidence} for "${opp.fields.title}" (${opp.sourceUrl})`, opp.id));
    }
    const suspicious = opp.trustSignals.find((s) => s.key === 'suspicious-language' && s.present);
    if (suspicious) {
      push(openTask(ctx, 'suspicious-language', `"${opp.fields.title}": ${suspicious.label}`, opp.id));
    }
    if (opp.scores.freshness < STALE_FRESHNESS_THRESHOLD && !opp.claimedByOrganizationId && opp.status !== 'closed') {
      push(openTask(ctx, 'stale-listing', `Could not confirm "${opp.fields.title}" recently (freshness ${opp.scores.freshness}).`, opp.id));
    }
  }
  return created;
}

export function resolveTask(ctx: VerificationContext, taskId: string, resolvedBy: string, dismiss = false): VerificationTask {
  const task = ctx.store.verificationTasks.get(taskId);
  if (!task) throw new Error(`Unknown verification task: ${taskId}`);
  task.status = dismiss ? 'dismissed' : 'resolved';
  task.resolvedAt = ctx.clock.now().toISOString();
  task.resolvedBy = resolvedBy;
  return task;
}

/** Admin resolves a conflict by picking the correct value; clears conflicts and re-derives downstream. */
export function resolveConflicts(ctx: VerificationContext, opportunityId: string): Opportunity {
  const opp = ctx.store.opportunities.get(opportunityId);
  if (!opp) throw new Error(`Unknown opportunity: ${opportunityId}`);
  opp.conflicts = [];
  if (opp.fields.deadline.kind === 'conflicting') opp.fields.deadline.kind = 'exact';
  return opp;
}

/** The strategy's admin "Radar Queue", grouped by reason. */
export function verificationQueue(store: RadarStore): Record<VerificationReason, VerificationTask[]> {
  const queue: Record<VerificationReason, VerificationTask[]> = {
    'low-confidence': [],
    'conflicting-data': [],
    'suspected-duplicate': [],
    'suspicious-language': [],
    'claim-review': [],
    'stale-listing': [],
    'page-gone': [],
  };
  for (const t of store.verificationTasks.values()) {
    if (t.status === 'open') queue[t.reason].push(t);
  }
  return queue;
}
