import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../apps/web/', import.meta.url)), true, { info() {}, error() {} });
const { tickGoals, goalPool } = await import('../apps/web/lib/goal-engine.ts');
const { tickCreatorReminders } = await import('../apps/web/lib/creator-reminders.ts');
const { tickCreatorFollowing } = await import('../apps/web/lib/creator-following.ts');
const accountId = process.argv.find(arg => arg.startsWith('--account='))?.slice(10);
const once = process.argv.includes('--once');
let stopped = false, wake;
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { stopped = true; wake?.(); });
console.log('Creator worker started. In-app reminders, goal check-ins and followed programs; no email delivery.');
do {
  try {
    const reminders = await tickCreatorReminders(accountId);
    const goals = await tickGoals(accountId);
    const following = await tickCreatorFollowing(accountId);
    if (once || reminders.processed || goals.processed || following.processed) console.log(JSON.stringify({ reminders, goals, following }));
  } catch (e) {
    console.error('Creator tick failed. Scheduled work remains retryable.', e instanceof Error ? e.message : String(e));
    if (once) process.exitCode = 1;
  }
  if (!once && !stopped) await new Promise(resolve => { const timer = setTimeout(resolve, 60000); wake = () => { clearTimeout(timer); resolve(); }; });
} while (!once && !stopped);
await goalPool().end();
