export type CreatorAuthorityEnvironment = Readonly<Record<string, string | undefined> & {
  MISSA_CREATOR_RELATIONAL_AUTHORITY?: string;
  DATABASE_URL?: string;
}>;

export type CreatorAuthorityHealth = Readonly<{
  mode: "compatibility" | "relational";
  ready: boolean;
  reason:
    | "relational-authority-disabled"
    | "database-not-configured"
    | "configured";
}>;

/** The creator authority switch is intentionally exact and server-only. */
export function creatorRelationalAuthorityEnabled(
  env: CreatorAuthorityEnvironment = process.env,
): boolean {
  return env.MISSA_CREATOR_RELATIONAL_AUTHORITY === "1";
}

/**
 * Return a credential-free readiness result. Schema readiness is verified by
 * the repository initializer; this function only guards configuration and
 * prevents relational mode from silently selecting compatibility storage.
 */
export function creatorRelationalAuthorityHealth(
  env: CreatorAuthorityEnvironment = process.env,
): CreatorAuthorityHealth {
  if (!creatorRelationalAuthorityEnabled(env)) {
    return {
      mode: "compatibility",
      ready: true,
      reason: "relational-authority-disabled",
    };
  }
  if (!env.DATABASE_URL) {
    return {
      mode: "relational",
      ready: false,
      reason: "database-not-configured",
    };
  }
  return { mode: "relational", ready: true, reason: "configured" };
}
