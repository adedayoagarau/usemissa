import Link from 'next/link';
import { ArrowUpRight, Bookmark, CalendarDays, CheckCircle2, Clock3, MapPin, Tag } from 'lucide-react';
import type { OpportunityBrowseProjection } from '@missa/radar-engine';
import { TrackButton } from '@/components/track-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

export function OpportunityCard({ item, userId }: { item: OpportunityBrowseProjection; userId?: string }) {
  const deadline = deadlineCopy(item.deadline);
  const sourceName = item.source.name || item.organizationName || 'Missa source';
  const reasons = item.personal?.tailoringReasons ?? [];

  return (
    <article className="group relative flex min-h-[19rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(28,24,21,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_12px_32px_rgba(28,24,21,0.08)]">
      <div className="flex gap-4 p-4 pb-3">
        <div className="relative flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-[linear-gradient(145deg,#f6eee9,#e4d6ce)] text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-deep">
          {item.identityAssetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.identityAssetUrl} alt={item.identityAssetAlt ?? sourceName} className="h-full w-full object-cover" />
          ) : <span className="px-2">{sourceInitials(item.organizationName ?? sourceName)}</span>}
          <span className="absolute inset-x-0 bottom-0 bg-black/10 px-1 py-1 text-[8px] tracking-[0.22em] text-white/90">MISSA / RADAR</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="bg-accent-tint text-accent-deep">{typeLabel(item.type)}</Badge>
            {item.status === 'closing-soon' && <Badge variant="destructive">Closing soon</Badge>}
            {item.status === 'deadline-extended' && <Badge variant="secondary">Deadline extended</Badge>}
          </div>
          <h2 className="font-heading text-[1.25rem] leading-tight font-medium tracking-[-0.02em] text-foreground">
            <Link href={`/opportunities/${item.id}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link>
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.organizationName ?? 'Organization not confirmed'}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.discipline && <span>{item.discipline}</span>}
            {item.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}
            {item.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{item.location}</span>}
          </div>
        </div>
      </div>
      <div className="mx-4 border-t border-border" />
      <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
        <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 text-muted-foreground" /><div><p className="font-mono text-[0.72rem] font-medium text-foreground">{deadline.label}</p><p className={cn('text-xs', deadline.urgent ? 'font-medium text-accent-deep' : 'text-muted-foreground')}>{deadline.detail}</p></div></div>
        <div className="flex items-start gap-2"><Tag className="mt-0.5 size-4 text-muted-foreground" /><div><p className="font-medium text-foreground">{item.fee.status === 'no-fee' ? 'No fee' : item.fee.status === 'paid' ? 'Paid' : 'Fee unclear'}</p><p className="text-xs text-muted-foreground">{item.prize ?? 'Submission details'}</p></div></div>
      </div>
      <div className="mx-4 rounded-lg border border-green/15 bg-green/5 px-3 py-2">
        {reasons.length > 0 ? <p className="flex items-center gap-1.5 text-xs font-medium text-green"><CheckCircle2 className="size-3.5" />{reasons[0].label}</p> : <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" />Fit signal will improve as your Passport profile fills out</p>}
      </div>
      <div className="relative z-10 mt-auto flex items-center gap-2 p-4 pt-3">
        {userId && !item.personal?.tracked ? <TrackButton userId={userId} opportunityId={item.id} /> : userId ? <Button size="sm" variant="secondary" disabled><Bookmark className="size-3.5" />Tracked</Button> : null}
        {item.submissionAvailable && <Button render={<Link href={`/api/opportunities/${item.id}/submission`} />} size="sm" variant="outline" className="gap-1.5">Submit <ArrowUpRight className="size-3.5" /></Button>}
        <Link href={`/opportunities/${item.id}`} className="ml-auto text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Details</Link>
      </div>
    </article>
  );
}
