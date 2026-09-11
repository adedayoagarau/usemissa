import assert from 'node:assert/strict';
import test from 'node:test';
import { agentControlErrorStatus, crmWriteError, stripeReceiptReferences } from './governedOperationRoutes';

test('CRM errors preserve typed conflict, hidden not-found, bad-request, and unavailable semantics', () => {
  assert.deepEqual(crmWriteError(Object.assign(new Error('CRM task idempotency conflict'), { name: 'ConflictError' })), { status: 409, message: 'CRM write conflicts with existing durable state.' });
  assert.deepEqual(crmWriteError(Object.assign(new Error('CRM owner not found'), { name: 'NotFoundError' })), { status: 404, message: 'CRM resource not found.' });
  assert.deepEqual(crmWriteError(new Error('Exact confirmation is required')), { status: 400, message: 'Exact confirmation is required' });
  assert.deepEqual(crmWriteError(new Error('connect ECONNREFUSED')), { status: 503, message: 'CRM write unavailable.' });
});

test('agent control exact confirmation is a bad request while infrastructure remains unavailable', () => {
  assert.equal(agentControlErrorStatus(new Error('Exact confirmation is required')), 400);
  assert.equal(agentControlErrorStatus(new Error('Agent target not found')), 404);
  assert.equal(agentControlErrorStatus(new Error('connect ECONNREFUSED')), 503);
});

test('Stripe receipt references retain string and expanded immutable identities', () => {
  assert.deepEqual(stripeReceiptReferences({ object: 'invoice', id: 'in_1', customer: 'cus_1', subscription: { id: 'sub_1' } }), {
    customerId: 'cus_1',
    subscriptionId: 'sub_1',
    invoiceId: 'in_1',
  });
  assert.deepEqual(stripeReceiptReferences({ object: 'customer', id: 'cus_2' }), { customerId: 'cus_2' });
});
