'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FieldType = 'text' | 'file-upload' | 'category-select' | 'fee-toggle';
const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Text',
  'file-upload': 'File upload',
  'category-select': 'Category select',
  'fee-toggle': 'Fee',
};

interface DraftField {
  type: FieldType;
  label: string;
  required: boolean;
}

/**
 * Story 6.3: Form Builder v1 -- add/remove/reorder fields from a predefined
 * set (no freeform field-type builder, per the AC and the UX spec's Form
 * Patterns note that a full custom builder is out of MVP scope). The UI
 * never says "Submission Path" -- this component's own labels say "form"
 * and "categories", per docs/missa-naming-decisions.md.
 */
export function FormBuilder({ organizationId, openCallId }: { organizationId: string; openCallId: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState('');
  const [fields, setFields] = useState<DraftField[]>([{ type: 'file-upload', label: 'Manuscript', required: true }]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const addField = () => setFields((f) => [...f, { type: 'text', label: '', required: false }]);
  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));
  const moveField = (i: number, dir: -1 | 1) =>
    setFields((f) => {
      const next = [...f];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const updateField = (i: number, patch: Partial<DraftField>) => setFields((f) => f.map((field, idx) => (idx === i ? { ...field, ...patch } : field)));

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/orgs/${organizationId}/open-calls/${openCallId}/submission-paths`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
          fields,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save form');
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-2 rounded-md border border-dashed border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form & categories</p>
      <Input
        className="mt-2"
        placeholder="Categories (comma-separated, e.g. fiction, poetry)"
        value={categories}
        onChange={(e) => setCategories(e.target.value)}
      />
      <div className="mt-3 space-y-2">
        {fields.map((field, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as FieldType })}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FIELD_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="flex-1"
              placeholder="Field label"
              value={field.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
            />
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
              required
            </label>
            <Button size="sm" variant="outline" type="button" onClick={() => moveField(i, -1)} disabled={i === 0}>
              ↑
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}>
              ↓
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => removeField(i)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="outline" type="button" onClick={addField}>
          Add field
        </Button>
        <Button size="sm" type="button" onClick={onSubmit} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save form'}
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
