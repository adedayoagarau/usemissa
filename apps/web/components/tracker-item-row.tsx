import { FitScoreBadge } from '@/components/explained-score';
import { StatusSelect } from '@/components/status-select';
import { Card, CardContent } from '@/components/ui/card';
import type { TrackerItem } from '@missa/radar-engine';

/** Shared row rendering for every Tracker view mode (Pipeline/Deadline/Type/
 * Organization/List) -- extracted from the original StatusPipelineBoard so
 * all views render an item identically, not five slightly-different copies. */
export function TrackerItemRow({ userId, item }: { userId: string; item: TrackerItem }) {
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
        </div>
        <StatusSelect userId={userId} opportunityId={item.opportunityId} value={item.myStatus} />
      </CardContent>
    </Card>
  );
}
