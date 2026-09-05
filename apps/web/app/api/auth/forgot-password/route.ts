import { NextResponse } from 'next/server';
import { creatorPoolFor, creatorRelationalAuthorityEnabled, PostgresCreatorAccountRepository } from '@missa/radar-adapters';
import { getEngine } from '@/lib/engine';
import { createPasswordResetToken } from '@/lib/password-reset-tokens';
import { deliverPasswordResetEmail } from '@/emails/password-reset';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email } = (body || {}) as { email?: unknown };
  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const connectionString = process.env.DATABASE_URL;

  // Always return identical success message to prevent user enumeration
  const genericSuccess = {
    ok: true,
    message: 'If an account exists with this email, a password reset link has been sent.',
  };

  try {
    let account: { id: string; email: string; passwordHash?: string; displayName?: string; active?: boolean } | undefined;

    if (connectionString && creatorRelationalAuthorityEnabled(process.env)) {
      const repository = new PostgresCreatorAccountRepository(creatorPoolFor(connectionString));
      account = await repository.accountByEmail(normalizedEmail);
    } else {
      const engine = await getEngine();
      account = [...engine.store.accounts.values()].find(
        (candidate) => candidate.email.toLowerCase() === normalizedEmail
      );
    }

    if (account && account.active !== false) {
      const token = createPasswordResetToken({
        accountId: account.id,
        email: account.email,
        passwordHashPrefix: account.passwordHash,
      });

      await deliverPasswordResetEmail({
        accountId: account.id,
        email: account.email,
        resetToken: token,
        displayName: account.displayName,
      }, connectionString);
    }

    return NextResponse.json(genericSuccess);
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(genericSuccess);
  }
}
