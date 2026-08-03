import { NextResponse } from 'next/server';
import { gmailAccountLookupKey } from '@missa/radar-engine';
import { getEngine, persistRadar } from '@/lib/engine';
import { verifyGooglePubSubOidc } from '@/lib/google-pubsub-auth';

export async function POST(request: Request) {
  const audience = process.env.GMAIL_PUBSUB_OIDC_AUDIENCE;
  const expectedEmail = process.env.GMAIL_PUBSUB_SERVICE_ACCOUNT;
  if (audience) {
    const claims = await verifyGooglePubSubOidc(request.headers.get('authorization'), audience, expectedEmail);
    if (!claims) return NextResponse.json({ accepted: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  } else {
    const configured = process.env.GMAIL_PUBSUB_SHARED_SECRET;
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Gmail Pub/Sub OIDC is not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    if (!configured || request.headers.get('authorization') !== `Bearer ${configured}`) return NextResponse.json({ accepted: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const body = await request.json() as { message?: { data?: string; messageId?: string } };
    const encoded = body.message?.data;
    if (!encoded) return NextResponse.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as { emailAddress?: string; historyId?: string };
    if (!decoded.emailAddress || !decoded.historyId) return NextResponse.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    const engine = await getEngine();
    const connection = engine.store.gmailConnections.find((item) => item.status === 'active' && item.googleAccountHash === gmailAccountLookupKey(decoded.emailAddress!));
    if (connection) {
      engine.queueGmailSync(connection.userId, 'pubsub', `pubsub:${body.message?.messageId ?? decoded.historyId}`);
      await persistRadar();
    }
    return NextResponse.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } }); }
}
