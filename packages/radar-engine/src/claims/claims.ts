import type { ClaimRequest, Opportunity, OpportunityFields } from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';
import { matchOrganizationByDomain } from '../alerts/alerts.js';

export interface ClaimContext {
  store: RadarStore;
  ids: IdGenerator;
  clock: Clock;
}

/**
 * Organization claim flow (strategy §§ 14B, 17): request → verify → approve.
 * A domain match (call discovered on the org's own website) is auto-approvable;
 * anything else opens an admin verification task.
 */
export function requestClaim(
  ctx: ClaimContext,
  opportunityId: string,
  organizationId: string,
  requestedBy: string,
): ClaimRequest {
  const opp = ctx.store.opportunities.get(opportunityId);
  if (!opp) throw new Error(`Unknown opportunity: ${opportunityId}`);
  const org = ctx.store.organizations.get(organizationId);
  if (!org) throw new Error(`Unknown organization: ${organizationId}`);
  if (opp.claimedByOrganizationId && opp.claimedByOrganizationId !== organizationId) {
    throw new Error('Opportunity already claimed by another organization');
  }

  const domainOrg = matchOrganizationByDomain(ctx.store, opp.sourceUrl);
  const domainMatch = domainOrg?.id === organizationId;

  const claim: ClaimRequest = {
    id: ctx.ids.next('claim'),
    opportunityId,
    organizationId,
    requestedBy,
    requestedAt: ctx.clock.now().toISOString(),
    verificationMethod: domainMatch ? 'domain-match' : 'manual-review',
    status: 'pending',
  };
  ctx.store.claims.set(claim.id, claim);

  if (domainMatch) {
    approveClaim(ctx, claim.id, 'radar:domain-verification');
  } else {
    const taskId = ctx.ids.next('vtask');
    ctx.store.verificationTasks.set(taskId, {
      id: taskId,
      claimRequestId: claim.id,
      opportunityId,
      reason: 'claim-review',
      details: `${org.name} requested to claim "${opp.fields.title}" but the source domain does not match; review manually.`,
      createdAt: ctx.clock.now().toISOString(),
      status: 'open',
    });
  }
  return ctx.store.claims.get(claim.id)!;
}

export function approveClaim(ctx: ClaimContext, claimId: string, decidedBy: string): ClaimRequest {
  const claim = ctx.store.claims.get(claimId);
  if (!claim) throw new Error(`Unknown claim: ${claimId}`);
  claim.status = 'approved';
  claim.decidedAt = ctx.clock.now().toISOString();
  claim.decidedBy = decidedBy;

  const opp = ctx.store.opportunities.get(claim.opportunityId)!;
  opp.claimedByOrganizationId = claim.organizationId;
  opp.fields.organizationId = claim.organizationId;
  const org = ctx.store.organizations.get(claim.organizationId);
  if (org) opp.fields.organizationName = org.name;

  // Resolve any open review task for this claim.
  for (const task of ctx.store.verificationTasks.values()) {
    if (task.claimRequestId === claimId && task.status === 'open') {
      task.status = 'resolved';
      task.resolvedAt = claim.decidedAt;
      task.resolvedBy = decidedBy;
    }
  }
  return claim;
}

export function rejectClaim(ctx: ClaimContext, claimId: string, decidedBy: string, note?: string): ClaimRequest {
  const claim = ctx.store.claims.get(claimId);
  if (!claim) throw new Error(`Unknown claim: ${claimId}`);
  claim.status = 'rejected';
  claim.decidedAt = ctx.clock.now().toISOString();
  claim.decidedBy = decidedBy;
  claim.note = note;
  for (const task of ctx.store.verificationTasks.values()) {
    if (task.claimRequestId === claimId && task.status === 'open') {
      task.status = 'resolved';
      task.resolvedAt = claim.decidedAt;
      task.resolvedBy = decidedBy;
    }
  }
  return claim;
}

/**
 * Claimed-organization edits are authoritative field overrides: they beat
 * crawled data, clear related conflicts, and are recorded like any change.
 */
export function applyOrganizationOverride(
  ctx: ClaimContext,
  opportunityId: string,
  organizationId: string,
  overrides: Partial<OpportunityFields>,
): Opportunity {
  const opp = ctx.store.opportunities.get(opportunityId);
  if (!opp) throw new Error(`Unknown opportunity: ${opportunityId}`);
  if (opp.claimedByOrganizationId !== organizationId) {
    throw new Error('Only the claiming organization can override listing fields');
  }
  opp.organizationOverrides = { ...opp.organizationOverrides, ...overrides };
  opp.fields = { ...opp.fields, ...overrides };
  opp.conflicts = [];
  opp.lastChangedAt = ctx.clock.now().toISOString();
  return opp;
}
