import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Neon Auth client enablement tolerates provider-managed whitespace", () => {
  const config = readFileSync(
    new URL("./neon-auth/client-config.ts", import.meta.url),
    "utf8",
  );
  const client = readFileSync(
    new URL("./neon-auth/client.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    config,
    /NEXT_PUBLIC_NEON_AUTH_ENABLED\?\.trim\(\) === ['"]1['"]/u,
  );
  assert.match(client, /neonAuthClient = createAuthClient\(\)/u);
});

test("the sign-in form loads the Neon Auth client on demand", () => {
  const source = readFileSync(
    new URL("../components/auth-form.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /from ["']@\/lib\/neon-auth\/client["']/u);
  assert.match(source, /from ["']@\/lib\/neon-auth\/load-client["']/u);
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
