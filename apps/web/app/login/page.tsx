import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { AuthForm } from '@/components/auth-form';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) redirect('/opportunities');

  return (
    <main className="px-6">
      <AuthForm />
    </main>
  );
}
