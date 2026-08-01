import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/authRedirect';
import { AuthForm } from '@/components/auth-form';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) redirect('/opportunities');
  const { next } = await searchParams;
  return <AuthForm initialMode="signup" redirectTo={safeAuthRedirect(next)} />;
}
