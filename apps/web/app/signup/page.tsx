import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { safeAuthIntent, safeAuthRedirect } from '@/lib/authRedirect';
import { AuthForm } from '@/components/auth-form';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; intent?: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const { next, intent } = await searchParams;
  const redirectTo = safeAuthRedirect(next);
  if (session) redirect(redirectTo);
  return <AuthForm initialMode="signup" redirectTo={redirectTo} intent={safeAuthIntent(intent)} />;
}
