'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusPipelineBoard } from '@/components/status-pipeline-board';
import { TrackerItemRow } from '@/components/tracker-item-row';
import type { TrackerItem, PipelineStage } from '@missa/radar-engine';

type ViewMode = 'pipeline' | 'deadline' | 'type' | 'organization' | 'list';

const VIEW_LABEL: Record<ViewMode, string> = {
  pipeline: 'Pipeline',
  deadline: 'Calendar',
  type: 'Types',
  organization: 'Organizations',
  list: 'List',
};

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Story 3.5: the remaining Tracker view modes beyond Pipeline (the default).
 * Naming per docs/missa-naming-decisions.md's Tracker views table: Pipeline /
 * Calendar (deadline-sorted) / Types / Organizations / List. All re-group the
 * SAME already-fetched TrackerView data client-side -- no extra API calls.
 *
 * "Work-Based View" (also in that table) is intentionally NOT implemented
 * here: it requires linking a tracked opportunity to a specific creative
 * Work the user submitted, which depends on the Library feature (Epic 5,
 * not built) existing first -- TrackedOpportunity has no work reference to
 * group by today. Faking it against opportunity data alone would misrepresent
 * what the view actually means, so it's left out rather than approximated.
 */
export function TrackerViewSwitcher({
  userId,
  pipeline,
  allItems,
}: {
  userId: string;
  pipeline: Record<PipelineStage, TrackerItem[]>;
  allItems: TrackerItem[];
}) {
  const [mode, setMode] = useState<ViewMode>('pipeline');
  const modes: ViewMode[] = ['pipeline', 'deadline', 'type', 'organization', 'list'];

  return (
    <div>
      <Tabs value={mode} onValueChange={(v) => setMode(v as ViewMode)}>
        <TabsList>
          {modes.map((m) => (
            <TabsTrigger key={m} value={m}>
              {VIEW_LABEL[m]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {mode === 'pipeline' && <StatusPipelineBoard userId={userId} pipeline={pipeline} />}

      {mode === 'deadline' &&
        (() => {
          const withDeadline = allItems
            .filter((i) => i.deadline)
            .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''));
          return (
            <div className="mt-4 space-y-2">
              {withDeadline.map((item) => (
                <TrackerItemRow key={item.opportunityId} userId={userId} item={item} />
              ))}
              {withDeadline.length === 0 && <p className="text-muted-foreground">Nothing with a deadline tracked.</p>}
            </div>
          );
        })()}

      {mode === 'type' &&
        groupBy(allItems, (i) => i.type).map(([type, items]) => (
          <div key={type} className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {type} ({items.length})
            </h2>
            <div className="mt-2 space-y-2">
              {items.map((item) => (
                <TrackerItemRow key={item.opportunityId} userId={userId} item={item} />
              ))}
            </div>
          </div>
        ))}

      {mode === 'organization' &&
        groupBy(allItems, (i) => i.organizationName ?? 'Unknown organization').map(([org, items]) => (
          <div key={org} className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {org} ({items.length})
            </h2>
            <div className="mt-2 space-y-2">
              {items.map((item) => (
                <TrackerItemRow key={item.opportunityId} userId={userId} item={item} />
              ))}
            </div>
          </div>
        ))}

      {mode === 'list' && (
        <div className="mt-4 space-y-2">
          {allItems.map((item) => (
            <TrackerItemRow key={item.opportunityId} userId={userId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
