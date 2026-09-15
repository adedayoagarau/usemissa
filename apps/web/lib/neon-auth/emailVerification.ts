export type NeonEmailIdentity = {
  emailVerified?: boolean | Date | string | null;
};

export type NeonAuthProblem = {
  code?: string | null;
  message?: string | null;
};

const VERIFICATION_ERROR_CODES = new Set([
  "EMAIL_NOT_CONFIRMED",
  "EMAIL_NOT_VERIFIED",
  "EMAIL_VERIFICATION_REQUIRED",
  "VERIFICATION_REQUIRED",
]);

const INVALID_CODE_ERROR_CODES = new Set(["INVALID_OTP", "OTP_EXPIRED"]);

export function isVerifiedNeonEmail(user: NeonEmailIdentity): boolean {
  return (
    user.emailVerified === true ||
    user.emailVerified instanceof Date ||
    (typeof user.emailVerified === "string" && user.emailVerified.length > 0)
  );
}

export function isEmailVerificationRequired(
  problem: NeonAuthProblem | undefined | null,
): boolean {
  const code = problem?.code?.trim().toUpperCase();
  if (code && VERIFICATION_ERROR_CODES.has(code)) return true;

  const message = problem?.message?.trim() ?? "";
  return (
    /email[^.]*not (?:verified|confirmed)/iu.test(message) ||
    /verify (?:(?:their|your) )?email/iu.test(message) ||
    /email verification (?:is )?required/iu.test(message)
  );
}

export function isInvalidEmailVerificationCode(
  problem: NeonAuthProblem | undefined | null,
): boolean {
  const code = problem?.code?.trim().toUpperCase();
  if (code && INVALID_CODE_ERROR_CODES.has(code)) return true;

  return /(?:invalid|incorrect|expired)[^.]*\b(?:otp|code)\b|\b(?:otp|code)\b[^.]*(?:invalid|incorrect|expired)/iu.test(
    problem?.message?.trim() ?? "",
  );
}
