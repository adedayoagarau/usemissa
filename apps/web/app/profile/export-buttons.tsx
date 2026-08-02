'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExportFormat = 'json' | 'csv';
const SESSION_EXPIRED = 'SESSION_EXPIRED';

/** Download the authenticated user's tracker without exposing export bytes to page state. */
export function ExportButtons() {
  const [busy, setBusy] = useState<ExportFormat>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function download(format: ExportFormat) {
    setBusy(format);
    setMessage(undefined);
    setError(undefined);
    try {
      const response = await fetch(`/api/me/export?format=${format}`, { headers: { accept: format === 'csv' ? 'text/csv' : 'application/json' } });
      const expectedType = format === 'csv' ? 'text/csv' : 'application/json';
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.toLowerCase().includes(expectedType)) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (response.status === 429) throw new Error('You can download another export in a moment.');
        if (response.status === 409) throw new Error(body.error ?? 'Library export is not available yet.');
        if (response.status === 401) {
          setError(SESSION_EXPIRED);
          return;
        }
        throw new Error(body.error ?? 'We could not prepare your export. Please try again.');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1] ?? `missa-tracker.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Export downloaded');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'We could not download your export. Please try again.');
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Download the opportunities you track and their status history. Library exports will appear when Library data is available.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={Boolean(busy)} onClick={() => download('json')} className="min-h-11 min-w-40 gap-2">
          <Download className="size-4" aria-hidden="true" />{busy === 'json' ? 'Preparing…' : 'Download JSON'}
        </Button>
        <Button type="button" variant="outline" disabled={Boolean(busy)} onClick={() => download('csv')} className="min-h-11 min-w-40 gap-2">
          <Download className="size-4" aria-hidden="true" />{busy === 'csv' ? 'Preparing…' : 'Download CSV'}
        </Button>
      </div>
      {message && <p role="status" aria-live="polite" className="text-sm text-green">{message}</p>}
      {error && <p role="alert" aria-live="assertive" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error === SESSION_EXPIRED ? <>Your session expired. <Link className="font-medium underline underline-offset-2" href="/login?next=%2Fprofile">Log in again</Link> to download your data.</> : error}</p>}
    </div>
  );
}
