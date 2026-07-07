import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    account: { id: session.account.id, email: session.account.email, isAdmin: session.account.isAdmin },
    memberships: session.memberships,
  });
}
