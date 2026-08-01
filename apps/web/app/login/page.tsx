import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';
import { safeAuthRedirect } from '@/lib/authRedirect';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) redirect('/opportunities');

  const { mode, next } = await searchParams;
  const initialMode = mode === 'signup' ? 'signup' : 'login';

  return <AuthForm initialMode={initialMode} redirectTo={safeAuthRedirect(next)} />;
}
