import { NextResponse } from 'next/server';
import { createChartNote, deleteChartNote, listChartNotes } from '@missa/radar-adapters';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';
import { platformAnalyticsDatabaseUrl } from '@/lib/platformAnalyticsDatabase';

const headers = { 'cache-control': 'private, no-store' };

async function guard(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return { denied: denied! };
  const connectionString = platformAnalyticsDatabaseUrl();
  if (!connectionString) return { denied: NextResponse.json({ error: 'A database is required for chart notes.' }, { status: 503, headers }) };
  return { connectionString, accountId: auth.session.account.id };
}

export async function GET(request: Request) {
  const result = await guard(request);
  if ('denied' in result) return result.denied;
  return NextResponse.json({ notes: await listChartNotes(result.connectionString) }, { headers });
}

export async function POST(request: Request) {
  const result = await guard(request);
  if ('denied' in result) return result.denied;
  const body = (await request.json().catch(() => ({}))) as { day?: unknown; label?: unknown };
  if (typeof body.day !== 'string' || typeof body.label !== 'string') return NextResponse.json({ error: 'A date and a label are required.' }, { status: 400, headers });
  try {
    const note = await createChartNote(result.connectionString, { day: body.day, label: body.label, createdBy: result.accountId });
    return NextResponse.json({ note }, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The note could not be saved.' }, { status: 400, headers });
  }
}

export async function DELETE(request: Request) {
  const result = await guard(request);
  if ('denied' in result) return result.denied;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^note_[0-9a-f-]{36}$/u.test(id)) return NextResponse.json({ error: 'Unknown note.' }, { status: 400, headers });
  return (await deleteChartNote(result.connectionString, id)) ? new NextResponse(null, { status: 204, headers }) : NextResponse.json({ error: 'Unknown note.' }, { status: 404, headers });
}
