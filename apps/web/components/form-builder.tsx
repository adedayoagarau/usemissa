'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBMISSION_TAXONOMY_OPTIONS, taxonomyLabelFor } from '@/lib/taxonomyOptions';

type FieldType = 'text' | 'file-upload' | 'category-select' | 'fee-toggle';
const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Text',
  'file-upload': 'File upload',
  'category-select': 'Category select',
  'fee-toggle': 'Fee',
};

interface DraftField {
  id?: string;
  type: FieldType;
  label: string;
  required: boolean;
}

interface ExistingPath {
  id: string;
  categories: string[];
  fields: Array<{ id: string; type: FieldType; label: string; required: boolean; order: number }>;
  feeCents?: number;
  taxonomyAssignments?: Array<{ termId: string; rule: 'accepted' | 'preferred' | 'required' | 'excluded'; required?: boolean }>;
}

/**
 * Story 6.3: Form Builder v1 -- add/remove/reorder fields from a predefined
 * set (no freeform field-type builder, per the AC and the UX spec's Form
 * Patterns note that a full custom builder is out of MVP scope). The UI
 * never says "Submission Path" -- this component's own labels say "form"
 * and "categories", per docs/missa-naming-decisions.md.
 */
export function FormBuilder({ organizationId, openCallId, existingPath }: { organizationId: string; openCallId: string; existingPath?: ExistingPath }) {
  const router = useRouter();
  const [categories, setCategories] = useState(existingPath?.categories.join(', ') ?? '');
  const [feeCents, setFeeCents] = useState(existingPath?.feeCents ? String(existingPath.feeCents / 100) : '');
  const [taxonomyAssignments, setTaxonomyAssignments] = useState<NonNullable<ExistingPath['taxonomyAssignments']>>(existingPath?.taxonomyAssignments ?? []);
  const [fields, setFields] = useState<DraftField[]>(existingPath?.fields.slice().sort((a, b) => a.order - b.order).map(({ id, type, label, required }) => ({ id, type, label, required })) ?? [{ type: 'file-upload', label: 'Manuscript', required: true }]);
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
        method: existingPath ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pathId: existingPath?.id,
          categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
          fields,
          feeCents: feeCents.trim() ? Math.round(Number(feeCents) * 100) : undefined,
          taxonomyAssignments,
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{existingPath ? 'Edit form & categories' : 'Form & categories'}</p>
      <Input
        className="mt-2"
        placeholder="Categories (comma-separated, e.g. fiction, poetry)"
        value={categories}
        onChange={(e) => setCategories(e.target.value)}
      />
      <Input className="mt-2" type="number" min="0" step="0.01" placeholder="Application fee in USD (optional)" value={feeCents} onChange={(e) => setFeeCents(e.target.value)} />
      <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who this form is for</p>
        <p className="mt-1 text-xs text-muted-foreground">Use canonical practice terms so applicants see the right form and your team can route submissions consistently.</p>
        <div className="mt-2 space-y-2">
          {taxonomyAssignments.map((assignment, index) => <div key={`${assignment.termId}-${assignment.rule}-${index}`} className="flex flex-wrap items-center gap-2">
            <select aria-label="Taxonomy term" className="h-9 min-w-48 flex-1 rounded-md border border-border bg-background px-2 text-sm" value={assignment.termId} onChange={(event) => setTaxonomyAssignments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, termId: event.target.value } : item))}>
              <option value="">Choose a practice term</option>{SUBMISSION_TAXONOMY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.facet}</option>)}
            </select>
            <select aria-label="Taxonomy rule" className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={assignment.rule} onChange={(event) => setTaxonomyAssignments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, rule: event.target.value as typeof assignment.rule, required: event.target.value === 'required' } : item))}>
              <option value="accepted">Accepted</option><option value="preferred">Preferred</option><option value="required">Required</option><option value="excluded">Excluded</option>
            </select>
            <Button size="sm" variant="outline" type="button" onClick={() => setTaxonomyAssignments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
          </div>)}
        </div>
        <Button size="sm" variant="outline" type="button" className="mt-2" onClick={() => setTaxonomyAssignments((current) => [...current, { termId: SUBMISSION_TAXONOMY_OPTIONS[0]?.value ?? '', rule: 'accepted' }])}>Add practice rule</Button>
        {taxonomyAssignments.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{taxonomyAssignments.map((assignment) => taxonomyLabelFor(assignment.termId)).filter(Boolean).join(', ')}</p>}
      </div>
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
