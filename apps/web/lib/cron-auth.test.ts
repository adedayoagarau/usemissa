import assert from 'node:assert/strict';
import test from 'node:test';
import { cronAuthorization } from './cron-auth';
import { GET as tick } from '../app/api/cron/tick/route';
import { GET as submissionCleanup } from '../app/api/cron/submission-cleanup/route';

const env = { CRON_SECRET: 'cron-secret-value' };

test('cron routes accept only the Authorization header', () => {
  const header = new Request('https://usemissa.com/api/cron/tick', {
    headers: { authorization: 'Bearer cron-secret-value' },
  });
  assert.equal(cronAuthorization(header, env), 'authorized');
  const query = new Request('https://usemissa.com/api/cron/tick?secret=cron-secret-value');
  assert.equal(cronAuthorization(query, env), 'unauthorized');
  const wrong = new Request('https://usemissa.com/api/cron/tick', { headers: { authorization: 'Bearer nope' } });
  assert.equal(cronAuthorization(wrong, env), 'unauthorized');
  assert.equal(cronAuthorization(header, {}), 'unconfigured');
});

test('tick and submission cleanup reject a secret in the query string', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = env.CRON_SECRET;
  try {
    for (const [handler, path] of [
      [tick, '/api/cron/tick'],
      [submissionCleanup, '/api/cron/submission-cleanup'],
    ] as const) {
      const response = await handler(new Request(`https://usemissa.com${path}?secret=cron-secret-value`));
      assert.equal(response.status, 401, path);
    }
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
