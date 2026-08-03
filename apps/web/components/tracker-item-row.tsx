import { FitScoreBadge } from '@/components/explained-score';
import { StatusSelect } from '@/components/status-select';
import { Card, CardContent } from '@/components/ui/card';
import type { TrackerItem } from '@missa/radar-engine';
import type { LibraryWork } from '@missa/radar-engine';
import { TrackerWorkLink } from '@/components/tracker-work-link';

/** Shared row rendering for every Tracker view mode (Pipeline/Deadline/Type/
 * Organization/List) -- extracted from the original StatusPipelineBoard so
 * all views render an item identically, not five slightly-different copies. */
export function TrackerItemRow({ userId, item, works = [] }: { userId: string; item: TrackerItem; works?: LibraryWork[] }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-base font-medium text-foreground">{item.title}</h3>
          <p className="text-sm text-muted-foreground">
            {item.organizationName ?? ''} · opportunity: {item.opportunityStatus}
            {item.deadline ? (
              <>
                {' '}
                · deadline <span className="font-mono">{item.deadline}</span> ({item.daysToDeadline}d)
              </>
            ) : (
              ''
            )}
            {item.daysOverdue ? ` · ${item.daysOverdue}d past their usual response time` : ''}
          </p>
          <div className="mt-1">
            <FitScoreBadge fit={item.fit} />
          </div>
          {!item.isManual && <TrackerWorkLink userId={userId} opportunityId={item.opportunityId} workId={item.workId} workTitle={item.workTitle} works={works} />}
        </div>
        {item.isManual ? <span className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">Imported</span> : <StatusSelect userId={userId} opportunityId={item.opportunityId} value={item.myStatus} />}
      </CardContent>
    </Card>
  );
}
