import { randomUUID } from "node:crypto";

export interface WorkspaceIdGenerator {
  next(prefix: string): string;
}

export function sequentialWorkspaceIds(
  existingIds: Iterable<string> = [],
): WorkspaceIdGenerator {
  const counters = new Map<string, number>();
  for (const id of existingIds) {
    const match = /^(.+)_(\d+)$/.exec(id);
    if (!match) continue;
    const [, prefix, raw] = match;
    counters.set(prefix, Math.max(counters.get(prefix) ?? 0, Number(raw)));
  }
  return {
    next(prefix: string): string {
      const next = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, next);
      return `${prefix}_${String(next).padStart(4, "0")}`;
    },
  };
}

export function uuidWorkspaceIds(): WorkspaceIdGenerator {
  return {
    next(prefix: string): string {
      return `${prefix}_${randomUUID()}`;
    },
  };
}
