import { newWritingSnapshotId } from "./writing-snapshots.ts";
import { sameWritingContent, type WritingContent } from "./writing.ts";

/** Loading placeholders must never become the session's starting version. */
export function initializeWritingHistory(
  recorders: Map<string, WritingHistoryRecorder>,
  entryId: string,
  content: WritingContent,
  enabled: boolean,
) {
  if (!enabled || recorders.has(entryId)) return;
  if (recorders.size >= 32) {
    const oldest = recorders.keys().next().value;
    if (oldest !== undefined) recorders.delete(oldest);
  }
  recorders.set(entryId, new WritingHistoryRecorder(content));
}

/** Bounded automatic checkpoints: session start, first pause, then changed intervals. */
export class WritingHistoryRecorder {
  private previous: WritingContent;
  private lastAt = 0;
  private started = false;
  private baseline = true;
  private pending: { id: string; content: WritingContent } | null = null;
  private readonly intervalMs: number;
  constructor(initial: WritingContent, intervalMs = 5 * 60_000) { this.previous = initial; this.intervalMs = intervalMs; }
  checkpoint(content: WritingContent, now: number): { id: string; content: WritingContent } | null {
    if (this.pending) return this.pending;
    if (!this.started) {
      if (sameWritingContent(this.previous, content)) return null;
      this.started = true;
      return this.pending = { id: newWritingSnapshotId(), content: this.previous };
    }
    if (sameWritingContent(this.previous, content)) return null;
    if (this.lastAt && now - this.lastAt < this.intervalMs) return null;
    return this.pending = { id: newWritingSnapshotId(), content };
  }
  confirmed(now: number) {
    if (!this.pending) return;
    this.previous = this.pending.content;
    // Preserve the first changed version soon after the baseline rather than waiting five minutes.
    this.lastAt = this.baseline ? 0 : now;
    this.baseline = false;
    this.pending = null;
  }
}
