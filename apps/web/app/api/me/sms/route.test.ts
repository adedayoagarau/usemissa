import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELETE, PATCH } from './route';
import { POST as confirm } from './confirm/route';
import { POST as start } from './start/route';

test('text reminder routes return 401 without a session', async () => {
  const requests = [
    start(new Request('http://localhost/api/me/sms/start', { method: 'POST', body: JSON.stringify({ phone: '+447700900123' }) })),
    confirm(new Request('http://localhost/api/me/sms/confirm', { method: 'POST', body: JSON.stringify({ code: '123456' }) })),
    PATCH(new Request('http://localhost/api/me/sms', { method: 'PATCH', body: JSON.stringify({ enabled: true }) })),
    DELETE(new Request('http://localhost/api/me/sms', { method: 'DELETE' })),
  ];
  for (const response of await Promise.all(requests)) assert.equal(response.status, 401);
});
