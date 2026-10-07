import assert from 'node:assert/strict';
import test from 'node:test';
import { assertScimError, scimFixture, scimRequest } from '../../../../../../../../test/scimFixture';
import { POST as createUser } from '../route';
import { DELETE as removeUser, GET as getUser, PATCH as patchUser } from './route';

type ScimUser = { id: string; active: boolean; roles: Array<{ value: string }> };

const params = (id: string, userId: string) => ({ params: Promise.resolve({ id, userId }) });
const patch = (organizationId: string, userId: string, body: unknown) => patchUser(scimRequest(organizationId, `/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }), params(organizationId, userId));
const remove = (organizationId: string, userId: string) => removeUser(scimRequest(organizationId, `/${userId}`, { method: 'DELETE' }), params(organizationId, userId));
const replace = (path: string, value: unknown) => ({ schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'replace', path, value }] });
const provision = async (organizationId: string, userName: string) => (await (await createUser(scimRequest(organizationId, '', { method: 'POST', body: JSON.stringify({ userName }) }), { params: Promise.resolve({ id: organizationId }) })).json() as ScimUser).id;

test('unknown users and non-members get a SCIM 404', async () => {
  const data = await scimFixture({ members: { admin: 'admin' } });
  const outsider = data.addAccount('outsider', { [data.otherOrganizationId]: 'viewer' });
  await assertScimError(await getUser(scimRequest(data.organizationId, '/acct_missing'), params(data.organizationId, 'acct_missing')), 404);
  await assertScimError(await getUser(scimRequest(data.organizationId, `/${outsider.id}`), params(data.organizationId, outsider.id)), 404);
  await assertScimError(await patch(data.organizationId, outsider.id, replace('active', false)), 404);
  await assertScimError(await remove(data.organizationId, outsider.id), 404);
  assert.equal(data.membership(outsider.id, data.otherOrganizationId)?.role, 'viewer');
});

test('deactivating or removing an account shared with another organization changes only this membership', async () => {
  const data = await scimFixture({ members: { admin: 'admin' } });
  const shared = data.addAccount('shared', { [data.organizationId]: 'reviewer', [data.otherOrganizationId]: 'admin' });
  const response = await patch(data.organizationId, shared.id, replace('active', false));
  assert.equal(response.status, 200);
  const user = await response.json() as ScimUser;
  assert.deepEqual([user.id, user.active, user.roles], [shared.id, false, []]);
  assert.equal(data.membership(shared.id), undefined);
  assert.notEqual(shared.active, false, 'the account still signs in for its other organization');
  assert.equal(data.membership(shared.id, data.otherOrganizationId)?.role, 'admin');
  assert.deepEqual(JSON.parse(data.auditFor(shared.id).at(-1)!.detail!), { organizationId: data.organizationId, role: 'reviewer', accountDeactivated: false });

  const second = data.addAccount('second', { [data.organizationId]: 'viewer', [data.otherOrganizationId]: 'viewer' });
  assert.equal((await remove(data.organizationId, second.id)).status, 204);
  assert.equal(data.membership(second.id), undefined);
  assert.notEqual(second.active, false);
  assert.equal(data.membership(second.id, data.otherOrganizationId)?.role, 'viewer');
});

test('deactivating or removing an account SCIM created also stops it signing in', async () => {
  const data = await scimFixture({ members: { admin: 'admin' } });
  const created = await provision(data.organizationId, data.emailFor('created'));
  assert.equal((await patch(data.organizationId, created, replace('active', false))).status, 200);
  assert.equal(data.radar.store.accounts.get(created)!.active, false);
  assert.ok(data.radar.store.accounts.get(created)!.sessionsValidAfter, 'existing sessions cannot come back on reactivation');
  assert.equal(data.membership(created), undefined);
  assert.deepEqual(JSON.parse(data.auditFor(created).at(-1)!.detail!), { organizationId: data.organizationId, role: 'member', accountDeactivated: true });

  const removed = await provision(data.organizationId, data.emailFor('removed'));
  assert.equal((await remove(data.organizationId, removed)).status, 204);
  assert.equal(data.radar.store.accounts.get(removed)!.active, false);

  const joinedElsewhere = await provision(data.organizationId, data.emailFor('joined'));
  data.radar.store.memberships.push({ accountId: joinedElsewhere, organizationId: data.otherOrganizationId, role: 'viewer', grantedAt: new Date().toISOString() });
  assert.equal((await remove(data.organizationId, joinedElsewhere)).status, 204);
  assert.notEqual(data.radar.store.accounts.get(joinedElsewhere)!.active, false, 'a SCIM-created account that joined another organization stays active');
});

test('role changes follow the owner and last-administrator safeguards', async () => {
  const data = await scimFixture({ members: { owner: 'owner', admin: 'admin', viewer: 'viewer' } });
  const owner = data.accounts.get('owner')!;
  const viewer = data.accounts.get('viewer')!;
  await assertScimError(await patch(data.organizationId, viewer, replace('roles', [{ value: 'owner' }])), 403);
  await assertScimError(await patch(data.organizationId, owner, replace('roles', [{ value: 'admin' }])), 403);
  await assertScimError(await patch(data.organizationId, owner, replace('active', false)), 403);
  await assertScimError(await remove(data.organizationId, owner), 403);
  await assertScimError(await patch(data.organizationId, viewer, replace('roles', [{ value: 'Administrator' }])), 400, 'invalidValue');
  assert.deepEqual([data.membership(owner)?.role, data.membership(viewer)?.role], ['owner', 'viewer']);

  const ok = await patch(data.organizationId, owner, { ...replace('active', true) });
  assert.equal(ok.status, 200, 'a no-op on an owner is allowed');

  const promoted = await patch(data.organizationId, viewer, replace('roles', [{ value: 'Program Manager' }]));
  assert.equal(promoted.status, 200);
  assert.deepEqual((await promoted.json() as ScimUser).roles, [{ value: 'program-manager' }]);
  assert.deepEqual(JSON.parse(data.auditFor(viewer).at(-1)!.detail!), { organizationId: data.organizationId, from: 'viewer', to: 'program-manager' });
  assert.equal(data.auditFor(viewer).at(-1)!.action, 'scim.user.role_changed');

  const legacy = await scimFixture({ members: { admin: 'admin', viewer: 'viewer' } });
  const lastAdmin = legacy.accounts.get('admin')!;
  await assertScimError(await patch(legacy.organizationId, lastAdmin, replace('roles', [{ value: 'viewer' }])), 409);
  await assertScimError(await patch(legacy.organizationId, lastAdmin, { roles: [{ value: 'viewer' }] }), 409);
  await assertScimError(await patch(legacy.organizationId, lastAdmin, replace('active', false)), 409);
  await assertScimError(await remove(legacy.organizationId, lastAdmin), 409);
  assert.equal(legacy.membership(lastAdmin)?.role, 'admin');
  assert.deepEqual(legacy.auditFor(lastAdmin), [], 'refused changes write no audit entry');
});

test('PATCH understands the value shapes Okta and Microsoft Entra send', async () => {
  const data = await scimFixture({ members: { admin: 'admin', entra: 'viewer', okta: 'viewer' } });
  const entra = data.accounts.get('entra')!;
  const okta = data.accounts.get('okta')!;
  await assertScimError(await patch(data.organizationId, entra, replace('active', 'maybe')), 400, 'invalidValue');
  assert.equal((await patch(data.organizationId, entra, { Operations: [{ op: 'Replace', path: 'active', value: 'False' }] })).status, 200);
  assert.equal(data.membership(entra), undefined, 'the string "False" deactivates');
  assert.equal((await patch(data.organizationId, okta, { Operations: [{ op: 'replace', value: { active: false } }] })).status, 200);
  assert.equal(data.membership(okta), undefined, 'a path-less replace deactivates');
});

test('reactivation applies only to accounts this organization manages and is audited', async () => {
  const data = await scimFixture({ members: { admin: 'admin' } });
  const created = await provision(data.organizationId, data.emailFor('created'));
  const account = data.radar.store.accounts.get(created)!;
  account.active = false;
  const reactivated = await patch(data.organizationId, created, replace('active', true));
  assert.equal((await reactivated.json() as ScimUser).active, true);
  assert.equal(account.active, true);
  assert.equal(data.auditFor(created).at(-1)!.action, 'scim.user.reactivated');

  const closed = data.addAccount('closed', { [data.organizationId]: 'viewer' });
  closed.active = false;
  await assertScimError(await patch(data.organizationId, closed.id, replace('active', true)), 403);
  assert.equal(closed.active, false);
});

test('removal is audited', async () => {
  const data = await scimFixture({ members: { admin: 'admin', viewer: 'viewer' } });
  const viewer = data.accounts.get('viewer')!;
  assert.equal((await remove(data.organizationId, viewer)).status, 204);
  const [entry] = data.auditFor(viewer);
  assert.equal(entry?.action, 'scim.user.removed');
  assert.deepEqual(JSON.parse(entry!.detail!), { organizationId: data.organizationId, role: 'viewer', accountDeactivated: false });
});
