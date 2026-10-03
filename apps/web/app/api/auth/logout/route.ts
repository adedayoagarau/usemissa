import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { getNeonAuth } from '@/lib/neon-auth/server';

export async function POST() {
  try {
    await getNeonAuth()?.signOut();
  } catch {
    // Clearing the Missa compatibility cookie is still safe if Neon Auth is
    // temporarily unavailable; the next request will fail closed there.
  }
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  clearSessionCookie(response);
  return response;
}
