import assert from 'node:assert/strict';
import test from 'node:test';
import { assertScimError, scimFixture, scimRequest } from '../../../../../../../test/scimFixture';
import { GET as listUsers, POST as createUser } from './route';

type ScimUser = { id: string; userName: string; externalId?: string; active: boolean; roles: Array<{ value: string }> };
type ScimList = { totalResults: number; startIndex: number; itemsPerPage: number; Resources: ScimUser[] };

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (organizationId: string, body: unknown) => createUser(scimRequest(organizationId, '', { method: 'POST', body: JSON.stringify(body) }), params(organizationId));
const list = (organizationId: string, query = '') => listUsers(scimRequest(organizationId, query), params(organizationId));

test('SCIM rejects a missing or wrong bearer token with a SCIM error', async () => {
  const data = await scimFixture();
  await assertScimError(await listUsers(scimRequest(data.organizationId, '', { headers: { authorization: 'Bearer wrong' } }), params(data.organizationId)), 401);
  await assertScimError(await listUsers(scimRequest(data.otherOrganizationId), params(data.otherOrganizationId)), 401);
});

test('provisioning a new user creates an account this organization manages', async () => {
  const data = await scimFixture();
  const response = await post(data.organizationId, { userName: data.emailFor('new'), externalId: 'idp-new', name: { givenName: 'New', familyName: 'Person' }, roles: [{ value: 'Reviewer' }] });
  assert.equal(response.status, 201);
  const user = await response.json() as ScimUser;
  assert.deepEqual([user.userName, user.externalId, user.active, user.roles], [data.emailFor('new'), 'idp-new', true, [{ value: 'reviewer' }]]);
  assert.equal(response.headers.get('location'), `/api/scim/v2/organizations/${data.organizationId}/Users/${user.id}`);
  const account = data.radar.store.accounts.get(user.id)!;
  assert.equal(account.provisionedByOrganizationId, data.organizationId);
  assert.equal(account.displayName, 'New Person');
  assert.deepEqual(data.auditFor(user.id).map((entry) => entry.action), ['scim.user.provisioned']);
});

test('provisioning an existing account changes only this organization membership', async () => {
  const data = await scimFixture();
  const shared = data.addAccount('shared', { [data.otherOrganizationId]: 'admin' });
  shared.displayName = 'Shared Person';
  shared.externalId = 'other-idp-id';

  const response = await post(data.organizationId, { userName: shared.email, externalId: 'idp-overwrite', name: { formatted: 'Renamed By IdP' }, active: true });
  assert.equal(response.status, 201);
  const user = await response.json() as ScimUser;
  assert.equal(user.id, shared.id);
  assert.equal(user.externalId, undefined, 'another identity provider\'s externalId is not exposed');
  assert.deepEqual([shared.active, shared.displayName, shared.externalId, shared.provisionedByOrganizationId], [undefined, 'Shared Person', 'other-idp-id', undefined]);
  assert.equal(data.membership(shared.id)?.role, 'member');
  assert.equal(data.membership(shared.id, data.otherOrganizationId)?.role, 'admin');

  await assertScimError(await post(data.organizationId, { userName: shared.email, active: false }), 409, 'uniqueness');
  assert.notEqual(shared.active, false, 'a repeated POST cannot deactivate the account');

  const personal = data.addAccount('personal');
  await assertScimError(await post(data.organizationId, { userName: personal.email, active: false }), 409);
  assert.notEqual(personal.active, false, 'SCIM never deactivates an account it does not manage');
  assert.equal(data.membership(personal.id), undefined);

  const closed = data.addAccount('closed');
  closed.active = false;
  const linked = await post(data.organizationId, { userName: closed.email, active: true });
  assert.equal(linked.status, 201);
  assert.equal((await linked.json() as ScimUser).active, false, 'SCIM cannot reopen an account it does not manage');
  assert.equal(closed.active, false);
});

test('provisioning refuses an owner role and unknown roles before creating anything', async () => {
  const data = await scimFixture();
  const accountCount = data.radar.store.accounts.size;
  await assertScimError(await post(data.organizationId, { userName: data.emailFor('owner'), roles: [{ value: 'owner' }] }), 403);
  await assertScimError(await post(data.organizationId, { userName: data.emailFor('superuser'), roles: [{ value: 'superuser' }] }), 400, 'invalidValue');
  assert.equal(data.radar.store.accounts.size, accountCount);
});

test('provisioning stops at the seat limit without leaving an account behind', async () => {
  const data = await scimFixture({ seatLimit: 2, members: { admin: 'admin', viewer: 'viewer' } });
  const accountCount = data.radar.store.accounts.size;
  const body = await assertScimError(await post(data.organizationId, { userName: data.emailFor('third') }), 409);
  assert.match(body.detail, /2-seat limit/);
  assert.equal(data.radar.store.accounts.size, accountCount);

  const outsider = data.addAccount('outsider', { [data.otherOrganizationId]: 'viewer' });
  await assertScimError(await post(data.organizationId, { userName: outsider.email }), 409);
  assert.equal(data.membership(outsider.id), undefined);
});

test('provisioning an existing member is a uniqueness conflict, not a silent role change', async () => {
  const data = await scimFixture({ members: { admin: 'admin', viewer: 'viewer' } });
  const admin = data.accounts.get('admin')!;
  await assertScimError(await post(data.organizationId, { userName: data.emailFor('admin'), roles: [{ value: 'viewer' }] }), 409, 'uniqueness');
  assert.equal(data.membership(admin)?.role, 'admin');
});

test('listing users supports the userName filter and pagination identity providers send', async () => {
  const data = await scimFixture({ members: { ada: 'admin', bea: 'reviewer', cy: 'viewer' } });
  const managed = await post(data.organizationId, { userName: data.emailFor('dee'), externalId: 'idp-dee' });
  const dee = await managed.json() as ScimUser;
  data.addAccount('outsider', { [data.otherOrganizationId]: 'viewer' });

  const all = await (await list(data.organizationId)).json() as ScimList;
  assert.deepEqual([all.totalResults, all.startIndex, all.itemsPerPage], [4, 1, 4]);

  const match = await (await list(data.organizationId, `?filter=${encodeURIComponent(`userName eq "${data.emailFor('BEA').toUpperCase()}"`)}`)).json() as ScimList;
  assert.equal(match.totalResults, 1);
  assert.deepEqual(match.Resources.map((user) => user.id), [data.accounts.get('bea')]);

  const external = await (await list(data.organizationId, `?filter=${encodeURIComponent('externalId eq "idp-dee"')}`)).json() as ScimList;
  assert.deepEqual(external.Resources.map((user) => user.id), [dee.id]);

  for (const missing of [data.emailFor('nobody'), data.emailFor('outsider')]) {
    const none = await (await list(data.organizationId, `?filter=${encodeURIComponent(`userName eq "${missing}"`)}`)).json() as ScimList;
    assert.deepEqual([none.totalResults, none.Resources], [0, []], `${missing} is not a user of this organization`);
  }

  await assertScimError(await list(data.organizationId, `?filter=${encodeURIComponent('displayName co "a"')}`), 400, 'invalidFilter');
  await assertScimError(await list(data.organizationId, `?filter=${encodeURIComponent('userName eq "a" or userName eq "b"')}`), 400, 'invalidFilter');

  const page = await (await list(data.organizationId, '?startIndex=2&count=2')).json() as ScimList;
  assert.deepEqual([page.totalResults, page.startIndex, page.itemsPerPage], [4, 2, 2]);
  assert.deepEqual(page.Resources.map((user) => user.id), all.Resources.slice(1, 3).map((user) => user.id));
  const clamped = await (await list(data.organizationId, '?startIndex=0&count=-1')).json() as ScimList;
  assert.deepEqual([clamped.totalResults, clamped.startIndex, clamped.itemsPerPage, clamped.Resources], [4, 1, 0, []]);
});
