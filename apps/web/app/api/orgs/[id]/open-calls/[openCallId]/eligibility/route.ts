import { NextResponse } from 'next/server';
import { z } from 'zod';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };
const schema = z.object({
  maxWorks: z.number().int().min(1).max(100).nullable().optional(),
  allowedCategories: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  requireFiles: z.boolean().optional(),
  maxSubmissionsPerSubmitter: z.number().int().min(1).max(50).nullable().optional(),
}).strict();

/** Screening rules for one opportunity. They raise flags for a person to look at; they never decline anyone. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404, headers });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Check the screening rules', issues: parsed.error.flatten().fieldErrors }, { status: 400, headers });
  const organization = result.access.radar.store.organizations.get(id)!;
  const rules = { ...(organization.customization?.eligibilityRules ?? {}) };
  const next = {
    ...(parsed.data.maxWorks ? { maxWorks: parsed.data.maxWorks } : {}),
    ...(parsed.data.allowedCategories?.length ? { allowedCategories: [...new Set(parsed.data.allowedCategories)] } : {}),
    ...(parsed.data.requireFiles ? { requireFiles: true } : {}),
    ...(parsed.data.maxSubmissionsPerSubmitter ? { maxSubmissionsPerSubmitter: parsed.data.maxSubmissionsPerSubmitter } : {}),
  };
  if (Object.keys(next).length) rules[openCallId] = next;
  else delete rules[openCallId];
  organization.customization = { ...(organization.customization ?? {}), eligibilityRules: rules };
  await persistOrganizationMutation(result.access, { action: 'opportunity.screening_rules_set', targetType: 'open_call', targetId: openCallId, detail: next }, { workspace: false });
  return NextResponse.json({ openCallId, rules: rules[openCallId] ?? {} }, { headers });
}
