import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
const version = () =>
  Number(process.env.MISSA_CALENDAR_TOKEN_KEY_VERSION || "1") || 1;
function key() {
  const configured = process.env.MISSA_CALENDAR_TOKEN_KEY;
  if (!configured && process.env.NODE_ENV === "production")
    throw new Error("Calendar credential encryption is not configured.");
  return createHash("sha256")
    .update(configured || "local-calendar-key-change-me")
    .digest();
}
export function encryptCalendarCredential(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv),
    body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: `v${version()}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${body.toString("base64url")}`,
    keyVersion: version(),
  };
}
export function decryptCalendarCredential(value: string) {
  const [v, iv, tag, body] = value.split(".");
  if (Number(v?.slice(1)) !== version() || !iv || !tag || !body)
    throw new Error("Calendar credential cannot be decrypted.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
