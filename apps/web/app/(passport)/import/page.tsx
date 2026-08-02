import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { TrackerImportStepper } from '@/components/tracker-import-stepper';

export default async function TrackerImportPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login?next=%2Fimport');
  return <TrackerImportStepper />;
}
