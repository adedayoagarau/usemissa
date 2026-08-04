import Link from 'next/link';
import { Bookmark, CalendarDays, CheckCircle2, Clock3, MapPin, Tag } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { TrackButton } from '@/components/track-button';
import { SaveOpportunityButton } from '@/components/save-opportunity-button';
import { ListPicker } from '@/components/list-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { opportunityFreshness } from '@/lib/opportunityFreshness';

function deadlineCopy(deadline: OpportunityBrowseProjection['deadline']): { label: string; detail: string; urgent: boolean } {
  if (!deadline.date) return { label: deadline.kind === 'rolling' ? 'Rolling' : deadline.kind === 'until-filled' ? 'Until filled' : 'Date unconfirmed', detail: deadline.raw ?? 'Check the guidelines', urgent: false };
  const date = new Date(`${deadline.date}T12:00:00`);
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  return { label: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date), detail: days < 0 ? 'Deadline passed' : days === 0 ? 'Closes today' : `${days} day${days === 1 ? '' : 's'} left`, urgent: days >= 0 && days <= 14 };
}

function sourceInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'M';
}

function typeLabel(type: OpportunityBrowseProjection['type']): string {
  return type === 'open-call' ? 'Open call' : type.charAt(0).toUpperCase() + type.slice(1);
}

export function OpportunityCard({ item, userId, selected, selectionHref }: { item: OpportunityBrowseProjection; userId?: string; selected?: boolean; selectionHref: string }) {
  const deadline = deadlineCopy(item.deadline);
  const sourceName = item.organizationName ?? item.source.name ?? 'Missa source';
  const reasons = item.personal?.tailoringReasons ?? [];
  // A failed fetch updates checkedAt but must not make a public card look
  // freshly verified. Prefer the last successful processing timestamp.
  const freshness = opportunityFreshness(item.source.processingSucceededAt);
  const detailHref = userId ? selectionHref : `/login?next=${encodeURIComponent(selectionHref.replace('/opportunities-preview', '/opportunities'))}`;

  return (
    <article className={cn('relative flex min-h-[16.5rem] flex-col overflow-hidden rounded-md border bg-card transition-colors', selected ? 'border-2 border-primary' : 'border-border hover:border-foreground/30')}>
      <Link href={detailHref} className="flex gap-3 p-3.5 pb-2.5">
        <div className="relative flex h-28 w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-[linear-gradient(145deg,#e9f0f2,#b9cdd2)] text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
          {item.identityAssetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.identityAssetUrl} alt={item.identityAssetAlt ?? sourceName} className="h-full w-full object-cover" />
          ) : <span className="px-2">{sourceInitials(sourceName)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5"><Badge variant="outline" className="h-5 px-1.5 text-[10px]">{typeLabel(item.type)}</Badge>{item.status === 'closing-soon' && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Closing soon</Badge>}</div>
          <h2 className="mt-2 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-foreground">{item.title}</h2>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.organizationName ?? 'Organization not confirmed'}</p>
          <p className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">{item.discipline && <span>{item.discipline}</span>}{item.genres.slice(0, 1).map((genre) => <span key={genre}>{genre}</span>)}{item.location && <span className="inline-flex items-center gap-0.5"><MapPin className="size-3" />{item.location}</span>}</p>
          <p className={cn('mt-2 text-[11px]', freshness.state === 'fresh' ? 'text-green' : freshness.state === 'stale' ? 'text-accent-deep' : 'text-muted-foreground')} title={freshness.detail}>{freshness.label} · {freshness.detail.replace(/^Checked /, '')}</p>
        </div>
      </Link>
      <div className="mx-3.5 border-t border-border" />
      <div className="grid grid-cols-2 gap-2 px-3.5 py-2.5 text-[11px]">
        <div className="flex items-start gap-1.5"><CalendarDays className="mt-0.5 size-3.5 text-muted-foreground" /><div><p className="font-mono font-medium text-foreground">{deadline.label}</p><p className={cn(deadline.urgent ? 'font-medium text-accent-deep' : 'text-muted-foreground')}>{deadline.detail}</p></div></div>
        <div className="flex items-start gap-1.5"><Tag className="mt-0.5 size-3.5 text-muted-foreground" /><div><p className="font-medium text-foreground">{item.fee.status === 'no-fee' ? 'No fee' : item.fee.status === 'paid' ? 'Paid' : 'Fee unclear'}</p><p className="line-clamp-1 text-muted-foreground">{item.prize ?? 'Submission details'}</p></div></div>
      </div>
      <div className="mx-3.5 rounded-sm border border-green/15 bg-green/5 px-2.5 py-1.5">{reasons.length > 0 ? <p className="flex items-center gap-1 text-[11px] font-medium text-green"><CheckCircle2 className="size-3.5" />Strong fit <span className="font-normal text-muted-foreground">· {reasons[0].label}</span></p> : <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="size-3.5" />Fit signal pending</p>}</div>
      <div className="relative z-10 mt-auto flex gap-2 p-3.5 pt-2.5">
        {userId && !item.personal?.tracked ? <div className="flex-1"><TrackButton userId={userId} opportunityId={item.id} /></div> : userId ? <Button size="sm" variant="outline" disabled className="flex-1">Tracked</Button> : <Link href={detailHref} className="flex-1 rounded-md border border-border py-1.5 text-center text-xs text-foreground">Log in to view details</Link>}
        {userId && item.personal?.tracked ? <ListPicker opportunityId={item.id} enabled compact /> : userId ? <SaveOpportunityButton userId={userId} opportunityId={item.id} /> : <Button type="button" size="icon-sm" variant="outline" aria-label="Save opportunity" title="Log in to save"><Bookmark className="size-3.5" aria-hidden="true" /></Button>}
      </div>
    </article>
  );
}
