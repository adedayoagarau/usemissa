# Writing integrations setup — 2026-10-09

Code and local tests do not establish a working Google connection in production. No live OAuth consent, real Drive upload/download or production migration was exercised by this development session.

Current rollout status supersedes the historical pass below: see [the release record](writing-release-2026-10-09.md). The owner has authorized migrations. The existing stable credential-encryption key is now enabled for both Preview and Production; no key rotation occurred. Google access setup awaits a separate browser-policy confirmation.

## Google Drive

Enable Google Drive API and Google Picker API in one Google Cloud project. Use a Web application OAuth client. Add the `drive.file` scope to the consent configuration; this integration does not request all-Drive read/write access. Testing mode requires the intended Google users to be allowed testers. Register the exact callback URI and authorized browser origins for each environment.

Required server environment variables:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI` — e.g. `https://usemissa.com/api/me/writing/drive/callback`; local uses `http://127.0.0.1:3101/api/me/writing/drive/callback` if registered.
- `GOOGLE_DRIVE_PICKER_API_KEY` — restrict to Google Picker API and the exact approved HTTP referrer origins. This key is intentionally returned to the browser for Picker; it is not an OAuth client secret.
- `GOOGLE_DRIVE_APP_ID` — numeric Google Cloud project number, from the same project as the client/key.
- `DATABASE_URL`
- `MISSA_CALENDAR_TOKEN_KEY` and its existing `MISSA_CALENDAR_TOKEN_KEY_VERSION` — reused authenticated encryption. Preview also needs the key configured; current deployment metadata showed it only in Production. If Preview and Production share a database, they must use the SAME stable encryption key/version. A separate Preview key requires an isolated Preview database; otherwise a reconnect could overwrite a production credential with unreadable ciphertext. Do not change an existing production key without a credential migration plan.

Drive-specific OAuth variables are explicit. A Calendar OAuth client may be reused only after its new Drive callback and consent scope are deliberately registered; the code does not silently use Calendar credentials. The browser CSP conditionally permits only `https://apis.google.com` scripts and `https://docs.google.com` Picker frames when the Picker configuration is present.

Apply migration `0102_creator_writing_connections.sql` using the normal reviewed database rollout. This session applied it only to disposable local `missa_writing_studio_qa_20261008`. It creates encrypted account/provider-bound connections, expiring one-use OAuth states, and account-scoped export operation records. Ciphertext copied to another account/provider is rejected. Secrets never enter redirects, logs or browser storage; a short-lived access token is returned solely for the in-memory Picker session.

Import selects a Google Doc, DOCX or plain text file through Picker. The server checks metadata/download permission and bounds streamed bytes to 10 MB. Docs are exported as DOCX; the existing bounded, inert importer creates a new Missa piece. Images/resources and unsupported document formatting are omitted with visible guidance; inspect the imported copy.

Export explicitly creates a DOCX file using the Article preset and proposed reading. Preview reports formatting/layout differences. It never overwrites the source Drive file. An account-scoped operation ID binds to the original document/title/layout payload and a stable Drive file ID; retries confirm the same copy instead of duplicating it. A failed/uncertain provider response does not claim success. “Prepare a new copy” deliberately starts a separate operation. Disconnect removes Missa's saved credential; it does not delete Drive files or revoke other Google integrations.

Primary references: [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Picker web sample](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample), [file exports and the 10 MB limit](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export), [multipart uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

## Zotero

The Zotero integration accepts a user-provided key with read-only access to that user's personal library. It validates the key's account and privileges through Zotero before storing the key in the same encrypted, account/provider-bound connection store. No browser/local-storage persistence and no write permission are required. See its implementation and validation handoff for supported item/import behavior. No live Zotero library was exercised in this session.

## Evidence boundaries

Local provider contract tests use fake provider responses, including the browser Picker test; they prove request routing, resource bounds, retry semantics and UI integration rather than real Google consent. Real PostgreSQL tests prove one-use OAuth state, expiry, stranger denial, credential separation and export payload binding. Before rollout, configure a test Google account, exercise actual consent, choose a real supported file, inspect the imported piece, export a copy and open it in Drive, retry an uncertain export and disconnect. Repeat in the intended deployment environment.

## Local verification result

The web production build passed after the integration changes. Focused provider/range/CSP tests passed (23), plus encrypted credential and real disposable PostgreSQL tests. Browser checks passed for exact listening payload boundaries, selection changes without network requests, Zotero selected-source import with draft preservation, real route origin/auth rejection, and Drive Picker/import/export retry flows with mocked provider responses. The offline restart/recovery browser suite also passed after rebuilding the offline bundle. Design-system and customer-facing language checks passed. A separate source review found no concrete credential-isolation, OAuth or export-idempotency faults. Live provider acceptance remains pending.

Preview deployment `dpl_7upPMQN8uP1nTD7c3yQ7GUjS9HWY` reached READY: https://missa-3gdnstmwk-adedayoagarau.vercel.app/doc . This confirms deployment/build completion, not a live provider journey. Production app remains unchanged. Migration0102 shared-database approval was requested and remains pending.
