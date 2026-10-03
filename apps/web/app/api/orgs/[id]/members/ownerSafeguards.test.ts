import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrgRole } from '@missa/radar-engine';
import { MEMBER_INVITE_ACCEPTED_MESSAGE } from '@/lib/organizationPeople';
import { organizationRoleFixture, requestAs } from '../../../../../test/organizationRoleFixture';
import { POST as inviteMember } from './route';
import { DELETE as removeMember, PATCH as changeMemberRole } from './[accountId]/route';

test('admins cannot grant or remove owner access and the last owner stays', async () => {
  const data = await organizationRoleFixture();
  const admin = data.accounts.get('admin')!;
  const owner = data.accounts.get('owner')!;
  const memberParams = (accountId: string) => ({ params: Promise.resolve({ id: data.organizationId, accountId }) });
  const patch = (actor: string, target: string, role: OrgRole) => changeMemberRole(requestAs(actor, `/members/${target}`, { method: 'PATCH', body: JSON.stringify({ role }) }), memberParams(target));

  assert.equal((await patch(admin, admin, 'owner')).status, 403, 'admin cannot self-promote to owner');
  assert.equal((await patch(admin, data.accounts.get('member')!, 'owner')).status, 403, 'admin cannot grant owner');
  assert.equal((await patch(admin, owner, 'member')).status, 403, 'admin cannot demote an owner');
  assert.equal((await removeMember(requestAs(admin, `/members/${owner}`, { method: 'DELETE' }), memberParams(owner))).status, 403, 'admin cannot remove an owner');
  assert.equal((await inviteMember(requestAs(admin, '/members', { method: 'POST', body: JSON.stringify({ email: 'outsider-with-account@role-access.test', role: 'owner' }) }), { params: Promise.resolve({ id: data.organizationId }) })).status, 403, 'admin cannot invite an owner');

  assert.equal((await patch(owner, owner, 'admin')).status, 409, 'the sole owner cannot step down');
  assert.equal((await removeMember(requestAs(owner, `/members/${owner}`, { method: 'DELETE' }), memberParams(owner))).status, 409, 'the sole owner cannot leave');
  assert.equal((await patch(owner, admin, 'owner')).status, 200, 'an owner can grant owner');
  assert.equal((await patch(owner, owner, 'admin')).status, 200, 'an owner can step down once another owner exists');
  assert.equal((await patch(admin, admin, 'admin')).status, 409, 'the promoted account is now the sole owner and cannot step down');
  assert.equal((await patch(owner, admin, 'admin')).status, 403, 'a former owner, now admin, cannot demote the owner');
});

test('member invites do not reveal whether an email has a Missa account', async () => {
  const data = await organizationRoleFixture();
  const invite = (email: string) => inviteMember(requestAs(data.accounts.get('owner')!, '/members', { method: 'POST', body: JSON.stringify({ email, role: 'viewer' }) }), { params: Promise.resolve({ id: data.organizationId }) });
  const unknown = await invite('nobody-here@role-access.test');
  const known = await invite('outsider-with-account@role-access.test');
  assert.equal(unknown.status, 202);
  assert.equal(known.status, 202);
  const unknownBody = await unknown.json() as Record<string, unknown>;
  const knownBody = await known.json() as Record<string, unknown>;
  assert.deepEqual(unknownBody, { ...knownBody, email: 'nobody-here@role-access.test' });
  assert.equal(knownBody.message, MEMBER_INVITE_ACCEPTED_MESSAGE);
  assert.doesNotMatch(JSON.stringify(knownBody), /acct|accountId/);
});
