import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Neon Auth client enablement tolerates provider-managed whitespace", () => {
  const source = readFileSync(
    new URL("./neon-auth/client.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /NEXT_PUBLIC_NEON_AUTH_ENABLED\?\.trim\(\) === ['"]1['"]/u,
  );
  assert.match(source, /neonAuthClient = createAuthClient\(\)/u);
});

test("signup recovers into OTP when the server requires verification", () => {
  const source = readFileSync(
    new URL("../components/auth-form.tsx", import.meta.url),
    "utf8",
  );
  const responseFailure = source.indexOf("if (!response.ok) {");
  const verificationRecovery = source.indexOf(
    'body.code === "email_verification_required"',
    responseFailure,
  );

  assert.ok(responseFailure >= 0);
  assert.ok(verificationRecovery > responseFailure);
  assert.ok(
    verificationRecovery < source.indexOf("const alreadyRegistered", responseFailure),
  );
});
