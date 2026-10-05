import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../apps/web/', import.meta.url)), true, { info() {}, error() {} });
const { goalPool } = await import('../apps/web/lib/goal-engine.ts');
const { runCreatorTick } = await import('../apps/web/lib/creator-tick.ts');
const accountId = process.argv.find(arg => arg.startsWith('--account='))?.slice(10);
const once = process.argv.includes('--once');
let stopped = false, wake;
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { stopped = true; wake?.(); });
console.log('Creator worker started. Deadline sweep, reminders and reminder email, goal check-ins, followed programs and calendar export.');
do {
  try {
    const tick = await runCreatorTick(accountId);
    const { reminders, goals, following, deadlines, reminderEmails, calendarSync } = tick;
    if (once || reminders.processed || goals.processed || following.processed || deadlines?.refreshed || deadlines?.unconfirmedNotices || reminderEmails.sent || reminderEmails.failed || calendarSync?.processed || calendarSync?.failed || calendarSync?.reconnectRequired)
      console.log(JSON.stringify(tick));
  } catch (e) {
    console.error('Creator tick failed. Scheduled work remains retryable.', e instanceof Error ? e.message : String(e));
    if (once) process.exitCode = 1;
  }
  if (!once && !stopped) await new Promise(resolve => { const timer = setTimeout(resolve, 60000); wake = () => { clearTimeout(timer); resolve(); }; });
} while (!once && !stopped);
await goalPool().end();
