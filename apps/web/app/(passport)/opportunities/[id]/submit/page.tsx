import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { SubmissionPrep } from '@/components/submission-prep';

export default async function SubmissionPreparationPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const { id } = await params;
  const opportunity = await getOpportunityRepository().getById(id, session?.account.id ? { accountId: session.account.id } : undefined);
  if (!opportunity || !session?.account.userId) notFound();
  return <SubmissionPrep userId={session.account.userId} opportunity={opportunity} />;
}
