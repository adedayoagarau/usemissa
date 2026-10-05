/**
 * The scheduled index update writes rankings only after a person has
 * approved the pipeline for this environment by setting
 * MISSA_RANKINGS_AUTO_PUBLISH=1. Without it, each run refreshes source
 * snapshots and records a dry-run summary for review.
 */
export function magazineIndexAutoPublish(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.MISSA_RANKINGS_AUTO_PUBLISH === "1";
}

export function cronAuthorized(
  request: Request,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    new URL(request.url).searchParams.get("secret") === secret
  );
}
