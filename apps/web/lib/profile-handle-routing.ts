import type { ResolvedHandle } from "@missa/radar-adapters";

export interface PublicProfileHandleRoute {
  handle: string;
  path: string;
  redirectTo?: string;
}

/** Keep shared and renamed Profile URLs on one canonical public path. */
export function publicProfileHandleRoute(
  rawHandle: string,
  resolved: ResolvedHandle,
): PublicProfileHandleRoute | null {
  if (
    !rawHandle.startsWith("@") ||
    resolved.state !== "claimed" ||
    resolved.subjectType !== "user"
  )
    return null;
  const requestedHandle = rawHandle.slice(1);
  const path = `/@${encodeURIComponent(resolved.handleKey)}`;
  return {
    handle: resolved.handleKey,
    path,
    ...(requestedHandle === resolved.handleKey ? {} : { redirectTo: path }),
  };
}
