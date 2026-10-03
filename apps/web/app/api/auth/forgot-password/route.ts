import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/engine';
import { getCreatorAccountRepository } from '@/lib/creatorRepositories';
import { createPasswordResetToken } from '@/lib/password-reset-tokens';
import {
  clientAddress,
  consumeAuthRateLimit,
  PASSWORD_RESET_RATE_LIMIT_POLICY,
} from '@/lib/auth-rate-limit';
import { deliverPasswordResetEmail } from '@/emails/password-reset';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: NO_STORE });
  }

  const parsed = z.object({ email: z.string().trim().min(1).max(320) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400, headers: NO_STORE });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  // Limit by network address and by the requested email before any lookup, so
  // the limiter cannot reveal whether an account exists and a single inbox
  // cannot be flooded with reset emails.
  const retryAfter = await consumeAuthRateLimit(
    { ip: clientAddress(request), email: normalizedEmail },
    PASSWORD_RESET_RATE_LIMIT_POLICY,
  );
  if (retryAfter !== undefined) {
    return NextResponse.json(
      { error: 'Too many reset requests. Try again later.' },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(retryAfter) } },
    );
  }

  // Always return identical success message to prevent user enumeration
  const genericSuccess = {
    ok: true,
    message: 'If an account exists with this email, a password reset link has been sent.',
  };

  try {
    // Read from the same account store that sign-in uses.
    const repository = getCreatorAccountRepository();
    const account = repository
      ? await repository.accountByEmail(normalizedEmail)
      : [...(await getEngine()).store.accounts.values()].find(
          (candidate) => candidate.email.toLowerCase() === normalizedEmail,
        );

    if (account && account.active !== false) {
      const token = createPasswordResetToken({
        accountId: account.id,
        email: account.email,
        passwordHashPrefix: account.passwordHash,
      });

      const report = await deliverPasswordResetEmail(
        {
          accountId: account.id,
          email: account.email,
          resetToken: token,
          displayName: account.displayName,
        },
        process.env.DATABASE_URL,
      );
      if (report.status !== 'sent' && report.status !== 'replayed') {
        // The response stays generic; operators still need to see the failure.
        console.error('Password reset email was not sent', {
          accountId: account.id,
          status: report.status,
          reason: report.reason,
        });
      }
    }

    return NextResponse.json(genericSuccess, { headers: NO_STORE });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(genericSuccess, { headers: NO_STORE });
  }
}
