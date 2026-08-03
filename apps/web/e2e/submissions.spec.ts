import { expect, request as playwrightRequest, test } from '@playwright/test';

test('submitter can save a draft, submit once, replay safely, and withdraw', async ({ baseURL }) => {
  const admin = await playwrightRequest.newContext({ baseURL });
  const submitter = await playwrightRequest.newContext({ baseURL });
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const adminLogin = await admin.post('/api/auth/login', {
      data: { email: 'editor@northriverreview.org', password: 'north-river-editor' },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminMe = await admin.get('/api/auth/me');
    expect(adminMe.ok()).toBeTruthy();
    const adminState = (await adminMe.json()) as { memberships: Array<{ organizationId: string; role: string }> };
    const organization = adminState.memberships.find((membership) => membership.role === 'admin');
    expect(organization).toBeTruthy();
    const organizationId = organization!.organizationId;

    const teamResponse = await admin.post(`/api/orgs/${organizationId}/teams`, { data: { name: `E2E team ${suffix}` } });
    expect(teamResponse.status()).toBe(201);
    const team = (await teamResponse.json()) as { id: string };
    const programResponse = await admin.post(`/api/orgs/${organizationId}/teams/${team.id}/programs`, { data: { name: `E2E program ${suffix}` } });
    expect(programResponse.status()).toBe(201);
    const program = (await programResponse.json()) as { id: string };
    const callResponse = await admin.post(`/api/orgs/${organizationId}/open-calls`, { data: { programId: program.id, title: `E2E call ${suffix}` } });
    expect(callResponse.status()).toBe(201);
    const call = (await callResponse.json()) as { id: string };
    const formResponse = await admin.post(`/api/orgs/${organizationId}/open-calls/${call.id}/submission-paths`, {
      data: {
        categories: ['Poetry'],
        fields: [{ type: 'text', label: 'Artist statement', required: true }],
      },
    });
    expect(formResponse.status()).toBe(201);
    const form = (await formResponse.json()) as { id: string; fields: Array<{ id: string }> };
    const statementFieldId = form.fields[0]!.id;
    const publishResponse = await admin.post(`/api/orgs/${organizationId}/open-calls/${call.id}/publish`);
    expect(publishResponse.ok()).toBeTruthy();

    const email = `submission-${suffix}@example.com`;
    const signup = await submitter.post('/api/auth/signup', {
      data: { email, password: 'correct-horse-battery', displayName: 'Submission E2E User' },
    });
    expect(signup.status()).toBe(201);

    const draftResponse = await submitter.put(`/api/submission-paths/${form.id}/draft`, {
      data: {
        category: 'Poetry',
        answers: { [statementFieldId]: 'A draft statement' },
        workTitles: ['Drafted poem'],
        idempotencyKey: `submission-${suffix}`,
      },
    });
    expect(draftResponse.ok()).toBeTruthy();
    const savedDraft = (await draftResponse.json()) as { draft: { workTitles: string[] } };
    expect(savedDraft.draft.workTitles).toEqual(['Drafted poem']);

    const idempotencyKey = `submission-${suffix}`;
    const submissionPayload = {
      category: 'Poetry',
      answers: { [statementFieldId]: 'A finished statement' },
      works: [{ title: 'Finished poem' }],
    };
    const submitResponse = await submitter.post(`/api/submission-paths/${form.id}/submit`, {
      data: submissionPayload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    expect(submitResponse.status()).toBe(201);
    const submitted = (await submitResponse.json()) as { submission: { id: string; status: string }; idempotent: boolean };
    expect(submitted.submission.status).toBe('submitted');
    expect(submitted.idempotent).toBe(false);

    const replayResponse = await submitter.post(`/api/submission-paths/${form.id}/submit`, {
      data: submissionPayload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    expect(replayResponse.ok()).toBeTruthy();
    const replayed = (await replayResponse.json()) as { submission: { id: string }; idempotent: boolean };
    expect(replayed.submission.id).toBe(submitted.submission.id);
    expect(replayed.idempotent).toBe(true);

    const mySubmissions = await submitter.get('/api/me/submissions');
    expect(mySubmissions.ok()).toBeTruthy();
    const listing = (await mySubmissions.json()) as { submissions: Array<{ id: string; works: Array<{ title: string }> }> };
    expect(listing.submissions.find((submission) => submission.id === submitted.submission.id)?.works[0]?.title).toBe('Finished poem');

    const withdraw = await submitter.post(`/api/me/submissions/${submitted.submission.id}/withdraw`);
    expect(withdraw.ok()).toBeTruthy();
    const withdrawn = (await withdraw.json()) as { status: string };
    expect(withdrawn.status).toBe('withdrawn');

    const receipt = await submitter.get(`/api/me/submissions/${submitted.submission.id}`);
    expect(receipt.ok()).toBeTruthy();
    expect(((await receipt.json()) as { submission: { status: string } }).submission.status).toBe('withdrawn');
  } finally {
    await admin.dispose();
    await submitter.dispose();
  }
});
