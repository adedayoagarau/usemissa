import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { LibraryView } from '@/components/library-view';

export default async function LibraryPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) return null;
  const engine = await getEngine();
  return <LibraryView userId={session.account.userId} materials={engine.getProfile(session.account.userId).materials} />;
}
