import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  creatorPoolFor,
  encryptCalendarCredential,
  decryptCalendarCredential,
} from "@missa/radar-adapters";
export type WritingConnectionProvider = "google-drive" | "zotero";
function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Account connections are unavailable.");
  return creatorPoolFor(process.env.DATABASE_URL);
}
export function sealWritingCredential(
  accountId: string,
  provider: WritingConnectionProvider,
  credential: string,
) {
  if (credential.length > 20000)
    throw new Error("Connection credential is too large.");
  return encryptCalendarCredential(
    JSON.stringify({ version: 1, accountId, provider, credential }),
  ).ciphertext;
}
export function openWritingCredential(
  accountId: string,
  provider: WritingConnectionProvider,
  ciphertext: string,
): string {
  const value = JSON.parse(decryptCalendarCredential(ciphertext));
  if (
    value.version !== 1 ||
    value.accountId !== accountId ||
    value.provider !== provider ||
    typeof value.credential !== "string"
  )
    throw new Error("Connection credential belongs to a different account.");
  return value.credential;
}
export async function getWritingConnection(
  accountId: string,
  provider: WritingConnectionProvider,
) {
  const rows = await database().query<{ credential_ciphertext: string }>(
    "select credential_ciphertext from creator_writing_connections where account_id=$1 and provider=$2",
    [accountId, provider],
  );
  return rows.rows[0]
    ? openWritingCredential(
        accountId,
        provider,
        rows.rows[0].credential_ciphertext,
      )
    : null;
}
export async function saveWritingConnection(
  accountId: string,
  provider: WritingConnectionProvider,
  credential: string,
) {
  await database().query(
    "insert into creator_writing_connections(account_id,provider,credential_ciphertext) values($1,$2,$3) on conflict(account_id,provider) do update set credential_ciphertext=excluded.credential_ciphertext,updated_at=now()",
    [
      accountId,
      provider,
      sealWritingCredential(accountId, provider, credential),
    ],
  );
}
export async function deleteWritingConnection(
  accountId: string,
  provider: WritingConnectionProvider,
) {
  await database().query(
    "delete from creator_writing_connections where account_id=$1 and provider=$2",
    [accountId, provider],
  );
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function createWritingOAuthState(
  accountId: string,
  redirectUri: string,
  returnPath = "/doc",
) {
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(48).toString("base64url");
  await database().query(
    "delete from creator_writing_oauth_states where expires_at<now()",
  );
  await database().query(
    "insert into creator_writing_oauth_states(state_hash,account_id,verifier_ciphertext,redirect_uri,return_path,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes')",
    [
      hash(state),
      accountId,
      sealWritingCredential(accountId, "google-drive", verifier),
      redirectUri,
      returnPath,
    ],
  );
  return {
    state,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}
export async function consumeWritingOAuthState(
  accountId: string,
  state: string,
) {
  const result = await database().query<{
    verifier_ciphertext: string;
    redirect_uri: string;
    return_path: string;
  }>(
    "update creator_writing_oauth_states set consumed_at=now() where account_id=$1 and state_hash=$2 and consumed_at is null and expires_at>now() returning verifier_ciphertext,redirect_uri,return_path",
    [accountId, hash(state)],
  );
  const row = result.rows[0];
  return row
    ? {
        verifier: openWritingCredential(
          accountId,
          "google-drive",
          row.verifier_ciphertext,
        ),
        redirectUri: row.redirect_uri,
        returnPath: row.return_path,
      }
    : null;
}
export async function driveExportFileId(
  accountId: string,
  operationId: string,
  payloadHash: string,
  candidate?: string,
) {
  if (candidate)
    await database().query(
      "insert into creator_writing_drive_exports(account_id,operation_id,file_id,payload_hash) values($1,$2,$3,$4) on conflict(account_id,operation_id) do nothing",
      [accountId, operationId, candidate, payloadHash],
    );
  const result = await database().query<{
    file_id: string;
    payload_hash: string;
  }>(
    "select file_id,payload_hash from creator_writing_drive_exports where account_id=$1 and operation_id=$2",
    [accountId, operationId],
  );
  if (result.rows[0] && result.rows[0].payload_hash !== payloadHash)
    throw new Error("This Drive export attempt belongs to a different copy.");
  return result.rows[0]?.file_id ?? null;
}
