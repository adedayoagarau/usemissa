import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';
import { safeAuthIntent, safeAuthRedirect } from '@/lib/authRedirect';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; intent?: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const { mode, next, intent } = await searchParams;
  const redirectTo = safeAuthRedirect(next);
  if (session) redirect(redirectTo);
  const initialMode = mode === 'signup' ? 'signup' : 'login';

  return <AuthForm initialMode={initialMode} redirectTo={redirectTo} intent={safeAuthIntent(intent)} />;
}
