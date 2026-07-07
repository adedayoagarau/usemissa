import type { AuditEntry } from '../domain/types.js';
import type { Clock, IdGenerator } from '../ports.js';
import type { RadarStore } from '../store/store.js';

export interface AuditContext {
  store: RadarStore;
  ids: IdGenerator;
  clock: Clock;
}

/** Append-only: who did what, to which object, when. Never mutated or deleted. */
export function recordAudit(
  ctx: AuditContext,
  accountId: string | undefined,
  action: string,
  targetType: string,
  targetId: string,
  detail?: string,
): AuditEntry {
  const entry: AuditEntry = {
    id: ctx.ids.next('audit'),
    at: ctx.clock.now().toISOString(),
    accountId,
    action,
    targetType,
    targetId,
    detail,
  };
  ctx.store.auditLog.push(entry);
  return entry;
}
