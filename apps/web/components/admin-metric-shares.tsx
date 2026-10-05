'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Copy, ExternalLink, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface ShareRow {
  token: string;
  title: string;
  metrics: string[];
  createdAt?: string;
  revokedAt?: string;
}

/** Create and manage public, read-only metric pages for investors or a "Missa in numbers" post. */
export default function AdminMetricShares({ options, shares }: { options: Array<{ key: string; label: string; sensitive: boolean }>; shares: ShareRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('Missa in numbers');
  const [selected, setSelected] = useState<string[]>(options.filter((option) => !option.sensitive).slice(0, 4).map((option) => option.key));
  const [saving, setSaving] = useState(false);
  const linkFor = (token: string) => `${window.location.origin}/stats/${token}`;

  async function create() {
    setSaving(true);
    const response = await fetch('/api/admin/metrics/shares', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, metrics: selected }) }).catch(() => undefined);
    setSaving(false);
    const payload = (await response?.json().catch(() => ({}))) as { share?: ShareRow; error?: string } | undefined;
    if (!response?.ok || !payload?.share) {
      toast.error(payload?.error ?? 'The link could not be created.');
      return;
    }
    await navigator.clipboard?.writeText(linkFor(payload.share.token)).catch(() => undefined);
    toast.success('Link created and copied.');
    router.refresh();
  }

  async function revoke(token: string) {
    const response = await fetch(`/api/admin/metrics/shares?token=${encodeURIComponent(token)}`, { method: 'DELETE' }).catch(() => undefined);
    if (!response?.ok) {
      toast.error('The link could not be turned off.');
      return;
    }
    toast.success('Link turned off. Anyone who has it will now see a not-found page.');
    router.refresh();
  }

  const active = shares.filter((share) => !share.revokedAt);
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="grid max-w-md gap-1 text-xs font-medium text-muted-foreground">
          Page title
          <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
        </label>
        <fieldset>
          <legend className="text-xs font-medium text-muted-foreground">Numbers to show</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {options.map((option) => (
              <label key={option.key} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={selected.includes(option.key)} onCheckedChange={(checked) => setSelected((current) => (checked ? [...current, option.key] : current.filter((key) => key !== option.key)))} />
                {option.label}
                {option.sensitive && <span className="text-xs text-warning">Private figure</span>}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="button" size="sm" onClick={create} disabled={saving || selected.length === 0}>
          <Link2 aria-hidden="true" />
          {saving ? 'Creating…' : 'Create public link'}
        </Button>
        <p className="text-xs text-muted-foreground">The page shows live numbers and is hidden from search engines. Turn a link off at any time.</p>
      </div>
      {active.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {active.map((share) => (
            <li key={share.token} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{share.title}</p>
                <p className="truncate text-xs text-muted-foreground">{share.metrics.length} numbers · created {share.createdAt ? new Date(share.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(linkFor(share.token)).then(() => toast.success('Link copied.'), () => toast.error('Copy failed.'))}>
                <Copy aria-hidden="true" />
                Copy
              </Button>
              <Button variant="ghost" size="sm" nativeButton={false} render={<a href={`/stats/${share.token}`} target="_blank" rel="noreferrer" />}>
                <ExternalLink aria-hidden="true" />
                Open
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => revoke(share.token)} aria-label={`Turn off link: ${share.title}`}>
                <Trash2 aria-hidden="true" />
                Turn off
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
