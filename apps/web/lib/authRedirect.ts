/** Keep auth return paths same-origin and within the app. */
export function safeAuthRedirect(value: string | undefined): string {
  if (
    !value ||
    value.length > 1_000 ||
    /[\\\u0000-\u001f\u007f]/u.test(value)
  ) {
    return "/opportunities";
  }
  try {
    if (/%(?:2f|5c|25)/iu.test(value)) return "/opportunities";
    const decoded = decodeURIComponent(value);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\")
    ) {
      return "/opportunities";
    }
    const target = new URL(decoded, "https://missa.invalid");
    if (
      target.origin !== "https://missa.invalid" ||
      !target.pathname.startsWith("/")
    ) {
      return "/opportunities";
    }
    const allowed = [
      "/opportunities",
      "/tracker",
      "/saved",
      "/calendar",
      "/library",
      "/profile",
      "/import",
      "/inbox",
      "/reviews",
      "/org",
      "/publication-claim",
    ].some(
      (prefix) =>
        target.pathname === prefix || target.pathname.startsWith(`${prefix}/`),
    );
    if (!allowed) {
      return "/opportunities";
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/opportunities";
  }
}

export type AuthIntent = {
  kind: "save-to-tracker";
  opportunityId: string;
};

/** Parse only explicit, bounded actions that may be resumed after auth. */
export function safeAuthIntent(
  value: string | undefined,
): AuthIntent | undefined {
  if (!value) return undefined;
  const match = /^save:([a-zA-Z0-9_-]{1,200})$/u.exec(value);
  if (!match?.[1]) return undefined;
  return { kind: "save-to-tracker", opportunityId: match[1] };
}

export function serializeAuthIntent(
  intent: AuthIntent | undefined,
): string | undefined {
  if (!intent) return undefined;
  return `save:${intent.opportunityId}`;
}
