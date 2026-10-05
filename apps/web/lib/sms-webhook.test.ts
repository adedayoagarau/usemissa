import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import type { SmsDeliveryReport } from '@missa/radar-adapters';
import { handleTelnyxEvent, inboundKeyword, parseTelnyxEvent, verifyTelnyxSignature } from './sms-webhook';

const now = Date.parse('2026-10-03T12:00:00.000Z');

/** A Telnyx-style keypair: the portal shows the raw 32-byte public key in base64. */
function keypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(12);
  return { publicKeyBase64: Buffer.from(raw).toString('base64'), privateKey };
}

function signed(body: string, privateKey: crypto.KeyObject, timestamp = Math.floor(now / 1000)) {
  const signature = crypto.sign(null, Buffer.from(`${timestamp}|${body}`), privateKey).toString('base64');
  return new Headers({ 'telnyx-signature-ed25519': signature, 'telnyx-timestamp': String(timestamp) });
}

test('verifies a fresh Telnyx Ed25519 webhook signature', () => {
  const { publicKeyBase64, privateKey } = keypair();
  const body = JSON.stringify({ data: { event_type: 'message.finalized' } });
  assert.equal(verifyTelnyxSignature(body, signed(body, privateKey), publicKeyBase64, now), true);
});

test('rejects a changed body, another key, a stale or future timestamp, and missing headers', () => {
  const { publicKeyBase64, privateKey } = keypair();
  const other = keypair();
  const body = JSON.stringify({ data: { event_type: 'message.received' } });
  const headers = signed(body, privateKey);
  assert.equal(verifyTelnyxSignature(`${body} `, headers, publicKeyBase64, now), false);
  assert.equal(verifyTelnyxSignature(body, headers, other.publicKeyBase64, now), false);
  assert.equal(verifyTelnyxSignature(body, signed(body, privateKey, Math.floor(now / 1000) - 301), publicKeyBase64, now), false);
  assert.equal(verifyTelnyxSignature(body, signed(body, privateKey, Math.floor(now / 1000) + 301), publicKeyBase64, now), false);
  assert.equal(verifyTelnyxSignature(body, new Headers(), publicKeyBase64, now), false);
  assert.equal(verifyTelnyxSignature(body, headers, 'not-a-key', now), false);
});

test('recognises opt-out and opt-in keywords only as the whole message', () => {
  for (const word of ['STOP', 'stop', ' Stop. ', 'UNSUBSCRIBE', 'cancel', 'End', 'QUIT', 'stopall']) assert.equal(inboundKeyword(word), 'stop', word);
  for (const word of ['START', 'unstop', 'Yes!']) assert.equal(inboundKeyword(word), 'start', word);
  for (const word of ['please stop texting', 'stopped', 'yes please', '', null]) assert.equal(inboundKeyword(word), null, String(word));
});

test('reads delivery reports with status, error and cost', () => {
  assert.deepEqual(
    parseTelnyxEvent({ data: { event_type: 'message.finalized', payload: { id: 'msg_1', to: [{ status: 'delivered' }], cost: { amount: '0.0040', currency: 'USD' } } } }),
    { type: 'delivery', report: { providerMessageId: 'msg_1', status: 'delivered', error: null, costAmount: 0.004, costCurrency: 'USD' } },
  );
  assert.deepEqual(
    parseTelnyxEvent({ data: { event_type: 'message.finalized', payload: { id: 'msg_2', to: [{ status: 'delivery_failed' }], errors: [{ code: '40300', title: 'Blocked as spam' }], cost: null } } }),
    { type: 'delivery', report: { providerMessageId: 'msg_2', status: 'failed', error: '40300 Blocked as spam', costAmount: null, costCurrency: null } },
  );
  const sending = parseTelnyxEvent({ data: { event_type: 'message.finalized', payload: { id: 'msg_3', to: [{ status: 'sending_failed' }] } } });
  assert.equal(sending.type === 'delivery' && sending.report.error, 'sending_failed');
  const sent = parseTelnyxEvent({ data: { event_type: 'message.sent', payload: { id: 'msg_4', to: [{ status: 'sent' }] } } });
  assert.equal(sent.type === 'delivery' && sent.report.status, 'sent');
  assert.deepEqual(parseTelnyxEvent({ data: { event_type: 'message.sent', payload: { to: [] } } }), { type: 'ignored' });
  assert.deepEqual(parseTelnyxEvent({ data: { event_type: 'call.initiated', payload: {} } }), { type: 'ignored' });
  assert.deepEqual(parseTelnyxEvent(null), { type: 'ignored' });
});

test('inbound STOP and START sync the phone; other inbound texts are ignored', async () => {
  const seen: string[] = [];
  const handlers = {
    applyDelivery: async (report: SmsDeliveryReport) => seen.push(`delivery:${report.providerMessageId}:${report.status}`),
    optOut: async (phone: string) => seen.push(`stop:${phone}`),
    optIn: async (phone: string) => seen.push(`start:${phone}`),
  };
  const inbound = (text: string, phone = '+44 7700 900123') => parseTelnyxEvent({ data: { event_type: 'message.received', payload: { from: { phone_number: phone }, text } } });

  assert.equal(await handleTelnyxEvent(inbound('STOP'), handlers), 'keyword');
  assert.equal(await handleTelnyxEvent(inbound('start'), handlers), 'keyword');
  assert.equal(await handleTelnyxEvent(inbound('Thanks!'), handlers), 'ignored');
  assert.equal(await handleTelnyxEvent(inbound('STOP', 'not a number'), handlers), 'ignored');
  await handleTelnyxEvent(parseTelnyxEvent({ data: { event_type: 'message.finalized', payload: { id: 'msg_9', to: [{ status: 'delivered' }] } } }), handlers);
  assert.deepEqual(seen, ['stop:+447700900123', 'start:+447700900123', 'delivery:msg_9:delivered']);
});
