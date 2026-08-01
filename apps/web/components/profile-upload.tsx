'use client';

import { useState, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import type { ProfileMaterial } from '@missa/radar-engine';

export function ProfileUpload({ userId, onUploaded }: { userId: string; onUploaded: (material: ProfileMaterial) => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(true); setMessage('');
    try {
      const formData = new FormData(); formData.set('file', file);
      const response = await fetch(`/api/users/${userId}/profile/materials/upload`, { method: 'POST', body: formData });
      const material = await response.json();
      if (!response.ok) throw new Error(material.error ?? 'Upload failed');
      onUploaded(material); setMessage('File uploaded');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed'); }
    finally { setPending(false); event.target.value = ''; }
  }

  return <div className="rounded-lg border border-dashed border-border p-4 sm:p-5"><label className="block text-sm font-medium"><span className="flex items-center gap-2"><Upload className="size-4 text-primary" />Upload a file</span><input type="file" accept="application/pdf,text/plain,application/rtf,image/jpeg,image/png,image/webp" onChange={upload} disabled={pending} className="mt-3 block min-h-11 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent-tint)] file:px-3 file:py-1.5 file:text-sm" /><span className="mt-2 block text-xs font-normal text-muted-foreground">PDF, RTF, text, or image · up to 10 MB · private storage</span></label>{message && <p className="mt-2 text-xs text-muted-foreground" role="status">{message}</p>}</div>;
}
