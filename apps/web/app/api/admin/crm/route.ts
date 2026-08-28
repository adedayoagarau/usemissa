import { NextResponse } from 'next/server';
import { createPlatformCrmContact, createPlatformCrmNote, createPlatformCrmTask, updatePlatformCrmTaskStatus } from '@missa/radar-adapters';
import { getPlatformAdminCrm } from '@/lib/platformAdminFoundations';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';
import { crmWriteError } from '@/lib/governedOperationRoutes';

const headers = { 'cache-control': 'private, no-store' };

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (denied) return denied;
  return NextResponse.json(await getPlatformAdminCrm(), { headers });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed CRM is required for CRM writes.' }, { status: 503, headers });
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: 'Idempotency-Key is required.' }, { status: 400, headers });
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid CRM request.' }, { status: 400, headers });
  const value = body as Record<string, unknown>;
  const kind = typeof value.kind === 'string' ? value.kind : 'note';
  const organizationId = typeof value.organizationId === 'string' ? value.organizationId.trim() : undefined;
  const accountId = typeof value.accountId === 'string' ? value.accountId.trim() : undefined;
  try {
    if (kind === 'contact') {
      const name = typeof value.name === 'string' ? value.name.trim() : '';
      if (!name || (!organizationId && !accountId)) return NextResponse.json({ error: 'A contact name and organizationId or accountId are required.' }, { status: 400, headers });
      const result = await createPlatformCrmContact({ connectionString: process.env.DATABASE_URL, actorAccountId: auth.session.account.id, organizationId, accountId, name, email: typeof value.email === 'string' ? value.email : undefined, role: typeof value.role === 'string' ? value.role : undefined, status: value.status === 'inactive' || value.status === 'lead' ? value.status : 'active', idempotencyKey });
      await trackPlatformAnalytics({ eventName: 'admin.crm_contact_created', source: 'admin-api', accountId: auth.session.account.id, organizationId, properties: { idempotent: result.idempotent } });
      return NextResponse.json(result, { headers, status: result.idempotent ? 200 : 201 });
    }
    if (kind === 'task') {
      const title = typeof value.title === 'string' ? value.title.trim() : '';
      if (!title || (!organizationId && !accountId)) return NextResponse.json({ error: 'A task title and organizationId or accountId are required.' }, { status: 400, headers });
      const result = await createPlatformCrmTask({ connectionString: process.env.DATABASE_URL, actorAccountId: auth.session.account.id, organizationId, accountId, contactId: typeof value.contactId === 'string' ? value.contactId.trim() : undefined, title, description: typeof value.description === 'string' ? value.description : undefined, priority: typeof value.priority === 'number' ? value.priority : undefined, dueAt: typeof value.dueAt === 'string' ? value.dueAt : undefined, ownerAccountId: typeof value.ownerAccountId === 'string' ? value.ownerAccountId.trim() : undefined, idempotencyKey });
      await trackPlatformAnalytics({ eventName: 'admin.crm_task_created', source: 'admin-api', accountId: auth.session.account.id, organizationId, properties: { idempotent: result.idempotent } });
      return NextResponse.json(result, { headers, status: result.idempotent ? 200 : 201 });
    }
    const title = typeof value.title === 'string' ? value.title.trim() : '';
    const noteBody = typeof value.body === 'string' ? value.body.trim() : '';
    if (!organizationId || !title || !noteBody) return NextResponse.json({ error: 'organizationId, title, and body are required for a note.' }, { status: 400, headers });
    const result = await createPlatformCrmNote({ connectionString: process.env.DATABASE_URL, actorAccountId: auth.session.account.id, subjectType: 'organization', subjectId: organizationId, title, body: noteBody, idempotencyKey });
    await trackPlatformAnalytics({ eventName: 'admin.crm_note_created', source: 'admin-api', accountId: auth.session.account.id, organizationId, properties: { idempotent: result.idempotent } });
    return NextResponse.json(result, { headers, status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const mapped = crmWriteError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status, headers });
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'A database-backed CRM is required for task updates.' }, { status: 503, headers });
  const body = await request.json().catch(() => ({}));
  const value = body as Record<string, unknown>;
  const taskId = typeof value.taskId === 'string' ? value.taskId.trim() : '';
  const status = value.status === 'open' || value.status === 'in-progress' || value.status === 'done' || value.status === 'snoozed' || value.status === 'cancelled' ? value.status : undefined;
  const expectedStatus = typeof value.expectedStatus === 'string' ? value.expectedStatus : '';
  const expectedVersion = typeof value.expectedVersion === 'number' ? value.expectedVersion : 0;
  const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() ?? '';
  if (!taskId || !status || !expectedStatus || !expectedVersion || !idempotencyKey) return NextResponse.json({ error: 'taskId, status, expectedStatus, expectedVersion, and Idempotency-Key are required.' }, { status: 400, headers });
  try {
    const task = await updatePlatformCrmTaskStatus({ connectionString: process.env.DATABASE_URL, actorAccountId: auth.session.account.id, taskId, status, expectedStatus, expectedVersion, idempotencyKey, confirmation: typeof value.confirmation === 'string' ? value.confirmation : undefined });
    await trackPlatformAnalytics({ eventName: 'admin.crm_task_status_changed', source: 'admin-api', accountId: auth.session.account.id, organizationId: task.organizationId, properties: { status } });
    return NextResponse.json({ task }, { headers });
  } catch (error) {
    const mapped = crmWriteError(error);
    return NextResponse.json({ error: mapped.status === 503 ? 'CRM task update unavailable.' : mapped.message }, { status: mapped.status, headers });
  }
}
