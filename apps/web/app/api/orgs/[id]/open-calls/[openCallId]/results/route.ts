import { NextResponse } from 'next/server';
import { z } from 'zod';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { publicResultsFor } from '@/lib/publicResults';
import { workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };
const configSchema = z.object({
  stages: z.array(z.enum(['longlist', 'shortlist', 'finalist'])).max(3),
  includeWinners: z.boolean(),
  introduction: z.string().trim().max(2_000).optional(),
}).strict();

type Access = Extract<Awaited<ReturnType<typeof requireOrganizationAccess>>, { ok: true }>['access'];

async function guard(request: Request, id: string, openCallId: string): Promise<{ access: Access } | { response: NextResponse }> {
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.manage' });
  if (!result.ok) return { response: NextResponse.json({ error: result.error }, { status: result.status, headers }) };
  if (workspaceRelationalAuthorityEnabled()) return { response: NextResponse.json({ error: 'Public results need stage letters, which are kept on the compatibility workspace.' }, { status: 503, headers }) };
  if (!result.access.scope.openCall(openCallId)) return { response: NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404, headers }) };
  return { access: result.access };
}

/** Preview of exactly what would be public, for the given stages. Nothing is published. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const guarded = await guard(request, id, openCallId);
  if ('response' in guarded) return guarded.response;
  const parsed = configSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Choose which stages to show and whether to include winners' }, { status: 400, headers });
  return NextResponse.json({ preview: publicResultsFor({ radar: guarded.access.radar, workspace: guarded.access.workspace, organizationId: id, openCallId, config: parsed.data }) }, { headers });
}

/** Publishes (or replaces) the public results for an opportunity. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const guarded = await guard(request, id, openCallId);
  if ('response' in guarded) return guarded.response;
  const parsed = configSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Choose which stages to show and whether to include winners' }, { status: 400, headers });
  if (parsed.data.stages.length === 0 && !parsed.data.includeWinners) return NextResponse.json({ error: 'Choose at least one stage or the winners to publish' }, { status: 400, headers });
  const organization = guarded.access.radar.store.organizations.get(id)!;
  const published = { ...(organization.customization?.publishedResults ?? {}) };
  published[openCallId] = { ...parsed.data, publishedAt: new Date().toISOString() };
  organization.customization = { ...(organization.customization ?? {}), publishedResults: published };
  await persistOrganizationMutation(guarded.access, { action: 'opportunity.results_published', targetType: 'open_call', targetId: openCallId, detail: { stages: parsed.data.stages, includeWinners: parsed.data.includeWinners } }, { workspace: false });
  return NextResponse.json({ published: published[openCallId], url: `/org/${encodeURIComponent(id)}/${encodeURIComponent(openCallId)}/results` }, { headers });
}

/** Takes the public results page down. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const guarded = await guard(request, id, openCallId);
  if ('response' in guarded) return guarded.response;
  const organization = guarded.access.radar.store.organizations.get(id)!;
  const published = { ...(organization.customization?.publishedResults ?? {}) };
  delete published[openCallId];
  organization.customization = { ...(organization.customization ?? {}), publishedResults: published };
  await persistOrganizationMutation(guarded.access, { action: 'opportunity.results_unpublished', targetType: 'open_call', targetId: openCallId }, { workspace: false });
  return NextResponse.json({ published: null }, { headers });
}
