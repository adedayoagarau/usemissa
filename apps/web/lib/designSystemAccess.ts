/**
 * The /design-system routes are internal prototypes and galleries. They are
 * hidden in production unless MISSA_DESIGN_SYSTEM_PUBLIC=1 is set, and stay
 * available in preview and local environments.
 */
export function designSystemRoutesPublic(env: Record<string, string | undefined> = process.env): boolean {
  if (env.MISSA_DESIGN_SYSTEM_PUBLIC === "1") return true;
  return env.VERCEL_ENV !== "production";
}
