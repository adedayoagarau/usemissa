import "server-only";
import {
  getWritingConnection,
  saveWritingConnection,
  driveExportFileId,
} from "./writing-connections";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
export const DRIVE_IMPORT_MAX = 10 * 1024 * 1024;
export function driveConfig() {
  return {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI,
    pickerKey: process.env.GOOGLE_DRIVE_PICKER_API_KEY,
    appId: process.env.GOOGLE_DRIVE_APP_ID,
  };
}
export function driveConfigured() {
  const c = driveConfig();
  return Boolean(
    c.clientId &&
    c.clientSecret &&
    c.redirectUri &&
    c.pickerKey &&
    c.appId &&
    process.env.DATABASE_URL &&
    (process.env.NODE_ENV !== "production" ||
      process.env.MISSA_CALENDAR_TOKEN_KEY),
  );
}
export function driveAuthorization(state: string, challenge: string) {
  const c = driveConfig();
  if (!driveConfigured()) throw new Error("Google Drive is not configured.");
  return (
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: c.clientId!,
      redirect_uri: c.redirectUri!,
      response_type: "code",
      scope: DRIVE_SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
    })
  );
}
async function tokenRequest(
  fields: Record<string, string>,
  fetcher: typeof fetch = fetch,
) {
  const c = driveConfig();
  if (!c.clientId || !c.clientSecret)
    throw new Error("Google Drive is not configured.");
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      ...fields,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.access_token !== "string")
    throw new Error("Reconnect Google Drive and try again.");
  if (
    typeof result.scope === "string" &&
    !result.scope.split(/\s+/).includes(DRIVE_SCOPE)
  )
    throw new Error("Google Drive file permission was not granted.");
  return result as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
  };
}
export async function exchangeDriveCode(
  accountId: string,
  code: string,
  verifier: string,
  redirectUri: string,
) {
  const result = await tokenRequest({
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  if (
    !result.refresh_token ||
    !result.scope?.split(/\s+/).includes(DRIVE_SCOPE)
  )
    throw new Error("Google Drive file permission was not granted.");
  await saveWritingConnection(
    accountId,
    "google-drive",
    JSON.stringify({ refreshToken: result.refresh_token }),
  );
}
export async function driveAccessToken(accountId: string) {
  const raw = await getWritingConnection(accountId, "google-drive");
  if (!raw) throw new Error("Connect Google Drive first.");
  const value = JSON.parse(raw);
  if (typeof value.refreshToken !== "string")
    throw new Error("Reconnect Google Drive.");
  const result = await tokenRequest({
    refresh_token: value.refreshToken,
    grant_type: "refresh_token",
  });
  if (result.refresh_token && result.refresh_token !== value.refreshToken)
    await saveWritingConnection(
      accountId,
      "google-drive",
      JSON.stringify({ refreshToken: result.refresh_token }),
    );
  return result.access_token;
}
export function validDriveFileId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{5,200}$/.test(id);
}
async function driveFetch(
  token: string,
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
) {
  return fetcher("https://www.googleapis.com/" + path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
}
export async function boundedDriveBytes(
  response: Response,
  max = DRIVE_IMPORT_MAX,
) {
  if (!response.ok)
    throw new Error(
      "Google Drive could not read this file. Choose a file you can download.",
    );
  if (Number(response.headers.get("content-length")) > max)
    throw new Error("Choose a file smaller than 10 MB.");
  if (!response.body) throw new Error("The Drive file was empty.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) {
        await reader.cancel();
        throw new Error("Choose a file smaller than 10 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, at);
    at += chunk.length;
  });
  return bytes;
}
export async function downloadDriveWriting(
  token: string,
  id: string,
  fetcher: typeof fetch = fetch,
) {
  if (!validDriveFileId(id)) throw new Error("Choose a file in Google Drive.");
  const metaResponse = await driveFetch(
    token,
    `drive/v3/files/${id}?fields=id,name,mimeType,size,capabilities(canDownload)&supportsAllDrives=true`, // missa-language-allow: Google API field name, not product copy
    {},
    fetcher,
  );
  if (!metaResponse.ok)
    throw new Error(
      "Google Drive could not open this file. Choose it in the picker again.",
    );
  const meta = await metaResponse.json();
  if (
    ![GOOGLE_DOC_MIME, DOCX_MIME, "text/plain"].includes(meta.mimeType) ||
    meta.capabilities?.canDownload === false
  )
    throw new Error("Choose a downloadable Google Doc, DOCX or text file.");
  if (Number(meta.size) > DRIVE_IMPORT_MAX)
    throw new Error("Choose a file smaller than 10 MB.");
  const path =
    meta.mimeType === GOOGLE_DOC_MIME
      ? `drive/v3/files/${id}/export?mimeType=${encodeURIComponent(DOCX_MIME)}`
      : `drive/v3/files/${id}?alt=media&supportsAllDrives=true`;
  return {
    bytes: await boundedDriveBytes(await driveFetch(token, path, {}, fetcher)),
    name: String(meta.name || "Imported writing").slice(0, 200),
    mime: meta.mimeType === "text/plain" ? "text/plain" : DOCX_MIME,
  };
}
export async function uploadDriveCopy(
  accountId: string,
  token: string,
  operationId: string,
  name: string,
  bytes: Uint8Array,
  payloadHash: string,
) {
  if (!/^[0-9a-f]{64}$/.test(payloadHash))
    throw new Error("The export copy could not be prepared.");
  let id = await driveExportFileId(accountId, operationId, payloadHash);
  if (!id) {
    const result = await driveFetch(
      token,
      "drive/v3/files/generateIds?count=1&space=drive&type=files",
    );
    if (!result.ok) throw new Error("Google Drive could not prepare the copy.");
    const generated = (await result.json()).ids?.[0];
    if (!validDriveFileId(generated))
      throw new Error("Google Drive could not prepare the copy.");
    id = await driveExportFileId(
      accountId,
      operationId,
      payloadHash,
      generated,
    );
  }
  if (!id) throw new Error("Google Drive could not prepare the copy.");
  const existing = await driveFetch(
    token,
    `drive/v3/files/${id}?fields=id,name,webViewLink,appProperties`,
  );
  if (existing.ok) {
    const file = await existing.json();
    if (file.appProperties?.missaOperationId !== operationId)
      throw new Error("The Drive copy could not be confirmed.");
    return {
      id: file.id,
      url: `https://drive.google.com/file/d/${id}/view`,
      name: file.name,
    };
  }
  if (existing.status !== 404)
    throw new Error("Google Drive could not confirm this copy. Retry later.");
  const boundary = "missa_" + operationId.replaceAll("-", "");
  const metadata = JSON.stringify({
    id,
    name,
    mimeType: DOCX_MIME,
    appProperties: { missaOperationId: operationId },
  });
  const head = new TextEncoder().encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${DOCX_MIME}\r\n\r\n`,
    ),
    tail = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);
  const response = await driveFetch(
    token,
    "upload/drive/v3/files?uploadType=multipart&fields=id,name",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
    fetch,
  );
  if (!response.ok)
    throw new Error(
      "The copy could not be confirmed. Retry to check the same Drive file.",
    );
  return { id, url: `https://drive.google.com/file/d/${id}/view`, name };
}

export function writingDriveMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const scheme = new URL(request.url).protocol;
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.protocol === scheme &&
      parsed.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
