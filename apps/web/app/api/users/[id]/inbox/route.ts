import { NextResponse } from 'next/server';
import { buildInboxDigest } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getCreatorInboxRepository } from '@/lib/creatorRepositories';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const repository = getCreatorInboxRepository();
  if (repository) {
    const rows = await repository.alerts(auth.session.account.id);
    const alerts = rows.map((row) => ({ ...row, audience: 'user' as const, userId: id, read: Boolean(row.readAt) }));
    const byKind = (kinds: string[]) => alerts.filter((alert) => kinds.includes(alert.kind));
    const newForYou = byKind(['new-match']);
    const openingSoon = byKind(['opening-soon', 'expected-reopen']);
    const closingSoon = byKind(['closing-soon']);
    const recentlyUpdated = byKind(['deadline-extended', 'deadline-changed', 'fee-changed', 'eligibility-changed', 'call-reopened', 'call-closed', 'page-gone']);
    const fromFollowedOrgs = byKind(['followed-org-new-call']);
    const parts = [`Missa found ${alerts.length} update${alerts.length === 1 ? '' : 's'} for you:`];
    if (newForYou.length) parts.push(`${newForYou.length} new match${newForYou.length === 1 ? '' : 'es'}`);
    if (closingSoon.length) parts.push(`${closingSoon.length} closing soon`);
    if (openingSoon.length) parts.push(`${openingSoon.length} opening soon or expected to reopen`);
    if (recentlyUpdated.length) parts.push(`${recentlyUpdated.length} updated since you saved them`);
    if (fromFollowedOrgs.length) parts.push(`${fromFollowedOrgs.length} from organizations you follow`);
    return NextResponse.json({
      userId: id, newForYou, openingSoon, closingSoon, recentlyUpdated, fromFollowedOrgs, summary: parts.join('\n'),
      reminders: byKind(['deadline-reminder']), overdue: byKind(['response-overdue']),
      withdrawalSuggestions: byKind(['withdrawal-suggested']), submissionReceipts: byKind(['submission-receipt']),
      submissionDecisions: byKind(['submission-decision']),
    });
  }

  const engine = await getEngine();
  const digest = buildInboxDigest(engine.store, id);
  const alerts = [...engine.store.alerts.values()].filter((a) => a.userId === id);
  const reminders = alerts.filter((a) => a.kind === 'deadline-reminder');
  const overdue = alerts.filter((a) => a.kind === 'response-overdue');
  const withdrawalSuggestions = alerts.filter((a) => a.kind === 'withdrawal-suggested');
  const submissionReceipts = alerts.filter((a) => a.kind === 'submission-receipt');
  const submissionDecisions = alerts.filter((a) => a.kind === 'submission-decision');

  return NextResponse.json({ ...digest, reminders, overdue, withdrawalSuggestions, submissionReceipts, submissionDecisions });
}
