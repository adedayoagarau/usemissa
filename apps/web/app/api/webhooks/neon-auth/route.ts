import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  renderAuthOtpEmail,
  type AuthOtpType,
} from '@/emails/auth-otp';
import {
  verifyNeonAuthWebhook,
  type NeonAuthWebhookPayload,
} from '@/lib/neonAuthWebhook';

const responseHeaders = { 'Cache-Control': 'no-store' };
const MAX_WEBHOOK_BYTES = 64 * 1024;
const otpTypes = new Set<AuthOtpType>([
  'email-verification',
  'sign-in',
  'forget-password',
]);

interface NeonAuthWebhookDependencies {
  verify: (
    rawBody: string,
    headers: Headers,
  ) => Promise<NeonAuthWebhookPayload>;
  deliver: (payload: NeonAuthWebhookPayload) => Promise<void>;
}

function expiresInMinutes(payload: NeonAuthWebhookPayload): number {
  const expiresAt = Date.parse(String(payload.event_data?.expires_at ?? ''));
  const issuedAt = Date.parse(payload.timestamp);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(issuedAt)) return 10;
  return Math.max(1, Math.ceil((expiresAt - issuedAt) / 60_000));
}

function defaultDependencies(): NeonAuthWebhookDependencies | undefined {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const authBaseUrl =
    process.env.NEON_AUTH_BASE_URL?.trim() ||
    process.env.DATABASE_NEON_AUTH_BASE_URL?.trim();
  if (!apiKey || !from || !authBaseUrl) return undefined;

  const resend = new Resend(apiKey);
  return {
    verify: (rawBody, headers) =>
      verifyNeonAuthWebhook(rawBody, headers, { baseUrl: authBaseUrl }),
    deliver: async (payload) => {
      const email = payload.user?.email?.trim().toLowerCase();
      const code = payload.event_data?.otp_code;
      const type = payload.event_data?.otp_type;
      const deliveryPreference = payload.event_data?.delivery_preference;
      if (
        !email ||
        typeof code !== 'string' ||
        typeof type !== 'string' ||
        !otpTypes.has(type as AuthOtpType) ||
        (deliveryPreference !== undefined && deliveryPreference !== 'email')
      ) {
        throw new Error('Unsupported Neon Auth OTP delivery payload.');
      }

      const rendered = renderAuthOtpEmail({
        email,
        code,
        type: type as AuthOtpType,
        expiresInMinutes: expiresInMinutes(payload),
      });
      const result = await resend.emails.send(
        {
          from,
          to: email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tags: [{ name: 'message_type', value: 'auth_otp' }],
        },
        { idempotencyKey: `neon-auth-${payload.event_id}` },
      );
      if (result.error) throw new Error('Resend rejected OTP delivery.');
    },
  };
}

export async function handleNeonAuthWebhook(
  request: Request,
  dependencies?: NeonAuthWebhookDependencies,
): Promise<Response> {
  const deps = dependencies ?? defaultDependencies();
  if (!deps) {
    return NextResponse.json(
      { error: 'Neon Auth email delivery is not configured.' },
      { status: 503, headers: responseHeaders },
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { error: 'Webhook payload is too large.' },
      { status: 413, headers: responseHeaders },
    );
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { error: 'Webhook payload is too large.' },
      { status: 413, headers: responseHeaders },
    );
  }

  let payload: NeonAuthWebhookPayload;
  try {
    payload = await deps.verify(rawBody, request.headers);
  } catch {
    return NextResponse.json(
      { error: 'Invalid Neon Auth webhook signature.' },
      { status: 401, headers: responseHeaders },
    );
  }
  if (payload.event_type !== 'send.otp') {
    return NextResponse.json(
      { error: 'Unsupported Neon Auth webhook event.' },
      { status: 422, headers: responseHeaders },
    );
  }

  try {
    await deps.deliver(payload);
  } catch {
    return NextResponse.json(
      { error: 'OTP delivery failed.' },
      { status: 502, headers: responseHeaders },
    );
  }
  return new Response(null, { status: 204, headers: responseHeaders });
}

export function POST(request: Request): Promise<Response> {
  return handleNeonAuthWebhook(request);
}
