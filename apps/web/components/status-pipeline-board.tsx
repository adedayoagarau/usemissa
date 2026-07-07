import { TrackerItemRow } from '@/components/tracker-item-row';
import type { TrackerItem, PipelineStage } from '@missa/radar-engine';

const STAGE_LABEL: Record<PipelineStage, string> = {
  planning: 'Planning',
  submitted: 'Submitted',
  'in-progress': 'In progress',
  outcome: 'Outcomes',
  archived: 'Archived',
};

/**
 * Story 3.5's shared "Status Pipeline Board" component (per the UX spec's
 * Component Strategy) -- the submitter-facing variant here groups by
 * PipelineStage with an inline status select per row. Epic 7 reuses the same
 * grouped-card layout for the org-facing Submissions inbox with a
 * bulk-action toolbar instead of a per-row select, per the UX spec.
 */
export function StatusPipelineBoard({
  userId,
  pipeline,
}: {
  userId: string;
  pipeline: Record<PipelineStage, TrackerItem[]>;
}) {
  const stages: PipelineStage[] = ['planning', 'submitted', 'in-progress', 'outcome', 'archived'];

  return (
    <div>
      {stages.map((stage) => {
        const items = pipeline[stage];
        if (!items.length) return null;
        return (
          <div key={stage} className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {STAGE_LABEL[stage]} ({items.length})
            </h2>
            <div className="mt-2 space-y-2">
              {items.map((item) => (
                <TrackerItemRow key={item.opportunityId} userId={userId} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
