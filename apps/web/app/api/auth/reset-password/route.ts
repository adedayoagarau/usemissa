import { NextResponse } from 'next/server';
import { creatorPoolFor, creatorRelationalAuthorityEnabled, PostgresCreatorAccountRepository } from '@missa/radar-adapters';
import { hashPassword } from '@missa/radar-engine';
import { getEngine } from '@/lib/engine';
import { verifyPasswordResetToken } from '@/lib/password-reset-tokens';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { token, password } = (body || {}) as { token?: unknown; password?: unknown };
  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: 'Password must be between 8 and 200 characters.' }, { status: 400 });
  }

  const connectionString = process.env.DATABASE_URL;

  try {
    // First, decode token to find accountId
    const preCheck = verifyPasswordResetToken(token);
    if (!preCheck.valid) {
      const errorMsg = preCheck.reason === 'expired'
        ? 'This password reset link has expired. Please request a new one.'
        : 'Invalid or malformed password reset link.';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { accountId } = preCheck;
    let account: { id: string; email: string; passwordHash: string; active?: boolean } | undefined;

    if (connectionString && creatorRelationalAuthorityEnabled(process.env)) {
      const repository = new PostgresCreatorAccountRepository(creatorPoolFor(connectionString));
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

    if (connectionString && creatorRelationalAuthorityEnabled(process.env)) {
      const repository = new PostgresCreatorAccountRepository(creatorPoolFor(connectionString));
      const updated = await repository.updatePassword(account.id, password);
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
      }
    } else {
      const engine = await getEngine();
      const memAccount = engine.store.accounts.get(account.id);
      if (memAccount) {
        memAccount.passwordHash = hashPassword(password);
      }
    }

    return NextResponse.json({ ok: true, message: 'Your password has been successfully updated.' });
  } catch (error) {
    console.error('Password reset execution error:', error);
    return NextResponse.json({ error: 'Unable to reset password at this time.' }, { status: 500 });
  }
}
