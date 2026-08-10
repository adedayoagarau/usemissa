import type { AuditEntry } from '@missa/radar-engine';
import type { DeliveryTask } from '@missa/workspace-engine';

export type MessageBatchState = 'Sent' | 'Partly sent' | 'Needs attention' | 'No recorded recipients';
export type DeliveryPlanState = 'Ready to set up' | 'Active' | 'Complete';

export interface DecisionEmailBatchDetail {
  workIds: string[];
  failedWorkIds: string[];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()))] : [];
}

export function decisionEmailBatchDetail(entry: Pick<AuditEntry, 'detail'>): DecisionEmailBatchDetail {
  if (!entry.detail) return { workIds: [], failedWorkIds: [] };
  try {
    const detail = JSON.parse(entry.detail) as { workIds?: unknown; failedWorkIds?: unknown };
    return { workIds: stringList(detail.workIds), failedWorkIds: stringList(detail.failedWorkIds) };
  } catch {
    return { workIds: [], failedWorkIds: [] };
  }
}

export function messageBatchState(detail: DecisionEmailBatchDetail): MessageBatchState {
  if (detail.workIds.length > 0 && detail.failedWorkIds.length > 0) return 'Partly sent';
  if (detail.failedWorkIds.length > 0) return 'Needs attention';
  if (detail.workIds.length > 0) return 'Sent';
  return 'No recorded recipients';
}

export function deliveryPlanState(task?: Pick<DeliveryTask, 'status'>): DeliveryPlanState {
  if (!task) return 'Ready to set up';
  return task.status === 'complete' ? 'Complete' : 'Active';
}

export function deliveryConsequenceRank(input: { task?: Pick<DeliveryTask, 'status' | 'dueDate'>; today: string }): number {
  if (input.task?.status === 'pending' && input.task.dueDate && input.task.dueDate < input.today) return 0;
  if (input.task?.status === 'pending') return 1;
  if (!input.task) return 2;
  return 3;
}
