import { expect, request as playwrightRequest, test } from '@playwright/test';

test('organization members can read but cannot change structure or elevate roles', async ({ baseURL }) => {
  const admin = await playwrightRequest.newContext({ baseURL });
  const member = await playwrightRequest.newContext({ baseURL });

  try {
    const adminLogin = await admin.post('/api/auth/login', {
      data: { email: 'editor@northriverreview.org', password: 'north-river-editor' },
    });
    expect(adminLogin.ok()).toBeTruthy();

    const adminSession = await admin.get('/api/auth/me');
    expect(adminSession.ok()).toBeTruthy();
    const adminState = (await adminSession.json()) as { memberships: Array<{ organizationId: string; role: string }> };
    const organization = adminState.memberships.find((membership) => membership.role === 'admin');
    expect(organization).toBeTruthy();
    const organizationId = organization!.organizationId;

    const invite = await admin.post(`/api/orgs/${organizationId}/members`, {
      data: { email: 'ada@example.com', role: 'member' },
    });
    expect(invite.status()).toBe(201);

    const createTeam = await admin.post(`/api/orgs/${organizationId}/teams`, {
      data: { name: 'Editorial' },
    });
    expect(createTeam.status()).toBe(201);

    const memberLogin = await member.post('/api/auth/login', {
      data: { email: 'ada@example.com', password: 'poetry-and-fiction' },
    });
    expect(memberLogin.ok()).toBeTruthy();

    const readableTeams = await member.get(`/api/orgs/${organizationId}/teams`);
    expect(readableTeams.ok()).toBeTruthy();

    const forbiddenTeam = await member.post(`/api/orgs/${organizationId}/teams`, {
      data: { name: 'Unauthorized team' },
    });
    expect(forbiddenTeam.status()).toBe(403);

    const forbiddenElevation = await member.post(`/api/orgs/${organizationId}/members`, {
      data: { email: 'ben@example.com', role: 'admin' },
    });
    expect(forbiddenElevation.status()).toBe(403);

    const finalAdminDemotion = await admin.post(`/api/orgs/${organizationId}/members`, {
      data: { email: 'editor@northriverreview.org', role: 'member' },
    });
    expect(finalAdminDemotion.status()).toBe(409);

    const foreignNestedResource = await admin.post(`/api/orgs/${organizationId}/open-calls/opencall_foreign/publish`);
    expect(foreignNestedResource.status()).toBe(404);
  } finally {
    await admin.dispose();
    await member.dispose();
  }
});
