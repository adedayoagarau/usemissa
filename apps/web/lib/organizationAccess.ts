import type { OrgMembership, RadarEngine } from "@missa/radar-engine";
import type { OrganizationScope, ReviewAssignment, WorkspaceEngine } from "@missa/workspace-engine";
import { getSessionAccount, type SessionAccount } from "./auth";
import { getEngine, persistRadar } from "./engine";
import { organizationRoleCan, type OrganizationCapability } from "./organizationProduct";
import { getCompatibilityWorkspaceEngine, persistWorkspace, workspaceRelationalAuthorityEnabled } from "./workspaceEngine";

export type { OrganizationCapability } from "./organizationProduct";

export interface OrganizationAccess {
  organizationId: string;
  session: SessionAccount;
  membership: OrgMembership;
  radar: RadarEngine;
  workspace: WorkspaceEngine;
  scope: OrganizationScope;
}

export type OrganizationAccessResult =
  | { ok: true; access: OrganizationAccess }
  | { ok: false; status: 401 | 403 | 404; error: string };

export interface OrganizationAccessOptions {
  /**
   * The capability (or any of several capabilities) the caller must hold. It
   * is required so that every Organization route states its access rule; the
   * role-to-capability table lives in `organizationProduct.ts`.
   */
  capability: OrganizationCapability | readonly OrganizationCapability[];
}

export const ORGANIZATION_ROLE_FORBIDDEN = "Your organization role cannot perform this action";

export async function requireOrganizationAccess(
  request: Request,
  organizationId: string,
  options: OrganizationAccessOptions,
): Promise<OrganizationAccessResult> {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return { ok: false, status: 401, error: "Not authenticated" };

  const radar = await getEngine();
  if (!radar.store.organizations.has(organizationId)) {
    return { ok: false, status: 404, error: "Unknown organization" };
  }

  const membership = session.memberships.find((candidate) => candidate.organizationId === organizationId);
  if (!membership) {
    return { ok: false, status: 403, error: "You are not a member of this organization" };
  }

  if (!organizationRoleCan(membership.role, options.capability)) {
    return { ok: false, status: 403, error: ORGANIZATION_ROLE_FORBIDDEN };
  }

  const workspace = workspaceRelationalAuthorityEnabled()
    ? undefined
    : await getCompatibilityWorkspaceEngine();
  return {
    ok: true,
    access: {
      organizationId,
      session,
      membership,
      radar,
      // Supported relational routes branch before accessing these compatibility-only fields.
      workspace: workspace as WorkspaceEngine,
      scope: workspace?.organizationScope(organizationId) as OrganizationScope,
    },
  };
}

/** True when the caller's Organization role holds the capability. */
export function organizationAccessCan(access: OrganizationAccess, capability: OrganizationCapability | readonly OrganizationCapability[]): boolean {
  return organizationRoleCan(access.membership.role, capability);
}

/**
 * Review assignments on a Submission that belong to the caller. A reviewer
 * without `submissions.read` may open only a Submission (and its Works) that
 * carries one of these. Recused assignments do not grant access. The
 * relational authority does not yet expose an assignment-scoped Submission
 * projection, so assignment-scoped access fails closed there.
 */
export function callerReviewAssignmentsForSubmission(access: OrganizationAccess, submissionId: string): ReviewAssignment[] {
  if (workspaceRelationalAuthorityEnabled() || !access.workspace || !access.scope) return [];
  if (!access.scope.submission(submissionId)) return [];
  return access.workspace
    .reviewAssignmentsForSubmission(submissionId)
    .filter((assignment) => assignment.reviewerAccountId === access.session.account.id && !(assignment as { recusedAt?: string }).recusedAt);
}

/**
 * Compatibility persistence until ADR-001's row repositories make the
 * Workspace mutation, audit event, and outbox event one database transaction.
 */
export async function persistOrganizationMutation(
  access: OrganizationAccess,
  audit: {
    action: string;
    targetType: string;
    targetId: string;
    detail?: Record<string, unknown>;
  },
  options: { workspace?: boolean } = { workspace: true },
): Promise<void> {
  access.radar.recordAudit(
    access.session.account.id,
    audit.action,
    audit.targetType,
    audit.targetId,
    audit.detail ? JSON.stringify(audit.detail) : undefined,
  );

  if (options.workspace !== false) await persistWorkspace();
  await persistRadar();
}
