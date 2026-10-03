import { NextResponse } from 'next/server';
import { hashPassword } from '@missa/radar-engine';
import { getEngine } from '@/lib/engine';
import { getCreatorAccountRepository } from '@/lib/creatorRepositories';
import { clientAddress, consumeAuthRateLimit, PASSWORD_RESET_RATE_LIMIT_POLICY } from '@/lib/auth-rate-limit';
import { verifyPasswordResetToken } from '@/lib/password-reset-tokens';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = z.object({ token: z.string().trim().min(1), password: z.string() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
  }

  const { token, password } = parsed.data;
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: 'Password must be between 8 and 200 characters.' }, { status: 400 });
  }

  const retryAfter = await consumeAuthRateLimit({ ip: clientAddress(request) }, PASSWORD_RESET_RATE_LIMIT_POLICY);
  if (retryAfter !== undefined) {
    return NextResponse.json(
      { error: 'Too many reset attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  // Write to the same account store that sign-in reads from, so a reset
  // always changes the password the next sign-in checks.
  const repository = getCreatorAccountRepository();

  try {
    // First, decode token to find accountId
    const preCheck = verifyPasswordResetToken(token);
    if (!preCheck.valid) {
      let errorMsg = 'Invalid or malformed password reset link.';
      if (preCheck.reason === 'expired') {
        errorMsg = 'This password reset link has expired. Please request a new one.';
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { accountId } = preCheck;
    let account: { id: string; email: string; passwordHash: string; active?: boolean } | undefined;

    if (repository) {
      const row = await repository.account(accountId);
      if (row) {
        account = { id: row.id, email: row.email, passwordHash: row.passwordHash, active: row.active };
      }
    } else {
      const engine = await getEngine();
      const row = engine.store.accounts.get(accountId);
      if (row) {
        account = { id: row.id, email: row.email, passwordHash: row.passwordHash, active: row.active };
      }
    }

    if (!account || account.active === false) {
      return NextResponse.json({ error: 'Account not found or inactive.' }, { status: 400 });
    }

    // Fully verify token signature including passwordHash consistency
    const fullCheck = verifyPasswordResetToken(token, account.passwordHash);
    if (!fullCheck.valid) {
      return NextResponse.json(
        { error: 'This reset link has already been used or is no longer valid.' },
        { status: 400 }
      );
    }

    if (repository) {
      const updated = await repository.updatePassword(account.id, password);
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
      }
    } else {
      const engine = await getEngine();
      const memAccount = engine.store.accounts.get(account.id);
      if (!memAccount) {
        return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
      }
      memAccount.passwordHash = hashPassword(password);
    }

    return NextResponse.json({ ok: true, message: 'Your password has been successfully updated.' });
  } catch (error) {
    console.error('Password reset execution error:', error);
    return NextResponse.json({ error: 'Unable to reset password at this time.' }, { status: 500 });
  }
}
