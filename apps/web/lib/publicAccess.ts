export type PublicAccessMode = "closed" | "waitlist" | "open";

const PUBLIC_ACCESS_MODES: readonly PublicAccessMode[] = [
  "closed",
  "waitlist",
  "open",
];

export function isPublicAccessMode(
  value: string | null | undefined,
): value is PublicAccessMode {
  return PUBLIC_ACCESS_MODES.includes(value as PublicAccessMode);
}

/**
 * The design-system review route can override the mode with ?access=... so
 * reviewers can inspect every policy state without changing production gates.
 */
export function resolvePublicAccessMode(
  requested?: string | null,
): PublicAccessMode {
  if (isPublicAccessMode(requested)) return requested;

  const configured = process.env.MISSA_PUBLIC_ACCESS_MODE;
  if (isPublicAccessMode(configured)) return configured;

  // Production currently remains waitlist-gated. Local review defaults to the
  // future open composition, while still rendering only real repository data.
  return process.env.VERCEL_ENV === "production" ? "waitlist" : "open";
}
