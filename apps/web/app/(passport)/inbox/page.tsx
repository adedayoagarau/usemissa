import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { buildInboxDigest, type Alert } from '@missa/radar-engine';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

function Section({ title, alerts }: { title: string; alerts: Alert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-2 space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-card p-3">
            <p className="font-medium text-foreground">{a.title}</p>
            <p className="text-sm text-muted-foreground">{a.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">why: {a.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function InboxPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.account.userId) redirect('/login');
  const userId = session.account.userId;

  const engine = await getEngine();
  const digest = buildInboxDigest(engine.store, userId);
  const alerts = [...engine.store.alerts.values()].filter((a) => a.userId === userId);
  const reminders = alerts.filter((a) => a.kind === 'deadline-reminder');
  const overdue = alerts.filter((a) => a.kind === 'response-overdue');
  const withdrawalSuggestions = alerts.filter((a) => a.kind === 'withdrawal-suggested');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
      <p className="mt-2 whitespace-pre-line text-muted-foreground">{digest.summary}</p>
      <Section title="New for you" alerts={digest.newForYou} />
      <Section title="Closing soon" alerts={digest.closingSoon} />
      <Section title="Opening soon / expected back" alerts={digest.openingSoon} />
      <Section title="Recently updated" alerts={digest.recentlyUpdated} />
      <Section title="From organizations you follow" alerts={digest.fromFollowedOrgs} />
      <Section title="Deadline reminders" alerts={reminders} />
      <Section title="No word back yet" alerts={overdue} />
      <Section title="Got an acceptance — consider withdrawing elsewhere" alerts={withdrawalSuggestions} />
    </div>
  );
}
