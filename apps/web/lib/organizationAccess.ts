import type { OrgMembership, OrgRole, RadarEngine } from "@missa/radar-engine";
import type { OrganizationScope, WorkspaceEngine } from "@missa/workspace-engine";
import { getSessionAccount, type SessionAccount } from "./auth";
import { getEngine, persistRadar } from "./engine";
import { getWorkspaceEngine, persistWorkspace } from "./workspaceEngine";

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

export async function requireOrganizationAccess(
  request: Request,
  organizationId: string,
  options: { roles?: readonly OrgRole[] } = {},
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

  if (options.roles && !options.roles.includes(membership.role)) {
    return { ok: false, status: 403, error: "Your organization role cannot perform this action" };
  }

  const workspace = await getWorkspaceEngine();
  return {
    ok: true,
    access: {
      organizationId,
      session,
      membership,
      radar,
      workspace,
      scope: workspace.organizationScope(organizationId),
    },
  };
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
