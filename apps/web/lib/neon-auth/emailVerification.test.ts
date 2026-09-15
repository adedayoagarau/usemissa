import assert from "node:assert/strict";
import test from "node:test";

import {
  isEmailVerificationRequired,
  isInvalidEmailVerificationCode,
  isVerifiedNeonEmail,
} from "./emailVerification";

test("only explicit Neon verification evidence counts as verified", () => {
  assert.equal(isVerifiedNeonEmail({ emailVerified: true }), true);
  assert.equal(isVerifiedNeonEmail({ emailVerified: new Date(0) }), true);
  assert.equal(
    isVerifiedNeonEmail({ emailVerified: "2026-09-14T00:00:00.000Z" }),
    true,
  );
  assert.equal(isVerifiedNeonEmail({ emailVerified: false }), false);
  assert.equal(isVerifiedNeonEmail({ emailVerified: "" }), false);
  assert.equal(isVerifiedNeonEmail({}), false);
});

test("verification-required provider responses are recognized without hiding other failures", () => {
  assert.equal(
    isEmailVerificationRequired({ code: "EMAIL_NOT_VERIFIED" }),
    true,
  );
  assert.equal(
    isEmailVerificationRequired({
      message: "The user must verify their email before signing in",
    }),
    true,
  );
  assert.equal(
    isEmailVerificationRequired({ message: "Email address is invalid" }),
    false,
  );
  assert.equal(
    isEmailVerificationRequired({ message: "Invalid email or password" }),
    false,
  );
});

test("invalid and expired email codes are separated from transport failures", () => {
  assert.equal(isInvalidEmailVerificationCode({ code: "INVALID_OTP" }), true);
  assert.equal(isInvalidEmailVerificationCode({ code: "OTP_EXPIRED" }), true);
  assert.equal(
    isInvalidEmailVerificationCode({ message: "Invalid verification code" }),
    true,
  );
  assert.equal(
    isInvalidEmailVerificationCode({ message: "Failed to fetch" }),
    false,
  );
});
