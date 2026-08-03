import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { EMAIL_MAX_ENVELOPE_BYTES, type InboundEmailEnvelope } from '@missa/radar-engine';
import { getEngine, persistRadar } from '@/lib/engine';

const REPLAY_WINDOW_MS = 5 * 60_000;
function secret(): string | undefined { return process.env.MISSA_INBOUND_EMAIL_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'local-inbound-secret-change-me'); }
function validSignature(body: string, timestamp: string | null, provided: string | null): boolean {
  const signingSecret = secret();
  if (!signingSecret || !timestamp || !provided || !/^\d+$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp) * 1000) > REPLAY_WINDOW_MS) return false;
  const expected = createHmac('sha256', signingSecret).update(`${timestamp}.${body}`).digest('hex');
  const actual = Buffer.from(provided.replace(/^sha256=/, ''), 'hex'); const wanted = Buffer.from(expected, 'hex');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > EMAIL_MAX_ENVELOPE_BYTES) return NextResponse.json({ accepted: false, reason: 'too-large' }, { status: 413 });
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > EMAIL_MAX_ENVELOPE_BYTES) return NextResponse.json({ accepted: false, reason: 'too-large' }, { status: 413 });
  if (!validSignature(body, request.headers.get('x-missa-timestamp'), request.headers.get('x-missa-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  let envelope: InboundEmailEnvelope;
  try {
    const parsed = JSON.parse(body) as Partial<InboundEmailEnvelope>;
    if (typeof parsed.provider !== 'string' || (parsed.providerMessageId !== undefined && typeof parsed.providerMessageId !== 'string') || (!parsed.providerMessageId && typeof parsed.messageIdHeader !== 'string') || !Array.isArray(parsed.to) || typeof parsed.receivedAt !== 'string' || typeof parsed.subject !== 'string' || !Array.isArray(parsed.attachments)) throw new Error('invalid');
    const combined = `${parsed.textBody ?? ''}${parsed.htmlBody ?? ''}`;
    if (combined.length > 100_000 || combined.includes('\u0000')) throw new Error('invalid');
    envelope = { ...parsed, headers: parsed.headers && typeof parsed.headers === 'object' ? parsed.headers : {}, attachments: parsed.attachments } as InboundEmailEnvelope;
  } catch { return NextResponse.json({ error: 'Invalid email envelope' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
  try {
    const engine = await getEngine();
    const result = engine.ingestInboundEmail(envelope);
    if (result.accepted) await persistRadar();
    return NextResponse.json(result.accepted ? { accepted: true, ...(result.candidateId ? { candidateId: result.candidateId } : {}) } : { accepted: false, reason: 'unavailable' }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Inbound email processing failed', error);
    return NextResponse.json({ accepted: false, reason: 'retry' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
