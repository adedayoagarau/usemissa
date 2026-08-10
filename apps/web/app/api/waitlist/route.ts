import { NextResponse } from 'next/server';
import { createWaitlistSignup } from '@missa/radar-adapters';
import { trackPlatformAnalytics } from '@/lib/platformAnalytics';

const emailPattern = /^\S+@\S+\.\S+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a valid JSON body.' }, { status: 400 });
  }

  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  const honeypot = typeof value.website === 'string' ? value.website.trim() : '';

  if (honeypot) return NextResponse.json({ accepted: true }, { status: 202 });
  if (email.length > 320 || !emailPattern.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'The waitlist is temporarily unavailable. Please try again soon.' }, { status: 503 });
  }

  try {
    const result = await createWaitlistSignup({
      connectionString: process.env.DATABASE_URL,
      email,
      source: typeof value.source === 'string' ? value.source : '/waitlist',
      campaign: readCampaign(value.campaign),
    });

    await trackPlatformAnalytics({
      eventName: 'public.waitlist_joined',
      source: 'web-waitlist',
      path: '/waitlist',
      properties: { waitlist: 'creator' },
    });
    return NextResponse.json({ accepted: result.accepted }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'The waitlist is temporarily unavailable. Please try again soon.' }, { status: 503 });
  }
}

function readCampaign(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => typeof item === 'string')
      .slice(0, 8)
      .map(([key, item]) => [key.slice(0, 80), String(item).slice(0, 200)]),
  );
}
