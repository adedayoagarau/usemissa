'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { OrganizationActionError, PendingLabel, useOrganizationAction } from '@/components/organization-action-kit';
import { organizationMutation } from '@/lib/organizationMutation';
import { SUBMISSION_TAXONOMY_OPTIONS } from '@/lib/taxonomyOptions';

type FieldType = 'text' | 'file-upload' | 'category-select' | 'fee-toggle';
type Rule = 'accepted' | 'preferred' | 'required' | 'excluded';

const FIELD_TYPE_LABELS: Record<FieldType, string> = { text: 'Text answer', 'file-upload': 'File upload', 'category-select': 'Category choice', 'fee-toggle': 'Fee' };
const RULE_LABELS: Record<Rule, string> = { accepted: 'Accepted', preferred: 'Preferred', required: 'Required', excluded: 'Excluded' };

type DraftField = { key: string; id?: string; type: FieldType; label: string; helpText: string; required: boolean; visibleWhen?: { fieldId: string; equals: string } };
type DraftRule = { key: string; termId: string; rule: Rule };

export type SavedSubmissionForm = {
  id: string;
  categories: string[];
  feeCents?: number;
  fields: Array<{ id: string; type: FieldType; label: string; helpText?: string; required: boolean; order: number; visibleWhen?: { fieldId: string; equals: string } }>;
  taxonomyAssignments?: Array<{ termId: string; rule: Rule; required?: boolean }>;
};

let draftKey = 0;
const nextKey = () => `draft-${(draftKey += 1)}`;

/**
 * Submission form editor for the compatibility workspace (policy
 * `input.short-text`, `choice.single-native-mobile`, `action.supporting`).
 * Field identity is kept on save so existing applicant drafts stay matched to
 * their questions; new fields get server-issued identifiers.
 */
export function OrganizationFormBuilder({ organizationId, openCallId, saved, canEdit }: { organizationId: string; openCallId: string; saved?: SavedSubmissionForm; canEdit: boolean }) {
  const router = useRouter();
  const [pathId, setPathId] = useState(saved?.id);
  const [categories, setCategories] = useState(saved?.categories.join(', ') ?? '');
  const [fee, setFee] = useState(saved?.feeCents ? String(saved.feeCents / 100) : '');
  const [rules, setRules] = useState<DraftRule[]>(() => (saved?.taxonomyAssignments ?? []).map((item) => ({ key: nextKey(), termId: item.termId, rule: item.rule })));
  const [fields, setFields] = useState<DraftField[]>(() =>
    saved?.fields.length
      ? saved.fields.slice().sort((a, b) => a.order - b.order).map((field) => ({ key: nextKey(), id: field.id, type: field.type, label: field.label, helpText: field.helpText ?? '', required: field.required, ...(field.visibleWhen ? { visibleWhen: field.visibleWhen } : {}) }))
      : [{ key: nextKey(), type: 'file-upload', label: 'Manuscript', helpText: '', required: true }],
  );
  const { pending, error, setError, run } = useOrganizationAction();

  const update = (key: string, patch: Partial<DraftField>) => setFields((current) => current.map((field) => (field.key === key ? { ...field, ...patch } : field)));
  const move = (index: number, direction: -1 | 1) => setFields((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
  });

  function save() {
    const unlabeled = fields.findIndex((field) => !field.label.trim());
    if (unlabeled >= 0) {
      setError(`Question ${unlabeled + 1} needs a label applicants can read.`);
      return;
    }
    const feeAmount = fee.trim() ? Number(fee) : undefined;
    if (feeAmount !== undefined && (!Number.isFinite(feeAmount) || feeAmount < 0)) {
      setError('Enter the application fee as a positive amount in US dollars, or leave it empty.');
      return;
    }
    run(async () => {
      const result = await organizationMutation<{ id?: string }>(`/api/orgs/${encodeURIComponent(organizationId)}/open-calls/${encodeURIComponent(openCallId)}/submission-paths`, {
        method: pathId ? 'PATCH' : 'POST',
        fallbackError: 'The submission form could not be saved. Your edits are still here.',
        body: {
          ...(pathId ? { pathId } : {}),
          categories: categories.split(',').map((item) => item.trim()).filter(Boolean),
          fields: fields.map((field, order) => ({ ...(field.id ? { id: field.id } : {}), type: field.type, label: field.label.trim(), ...(field.helpText.trim() ? { helpText: field.helpText.trim() } : {}), required: field.required, order, ...(field.visibleWhen ? { visibleWhen: field.visibleWhen } : {}) })),
          ...(feeAmount ? { feeCents: Math.round(feeAmount * 100) } : {}),
          taxonomyAssignments: rules.filter((item) => item.termId).map((item) => ({ termId: item.termId, rule: item.rule, ...(item.rule === 'required' ? { required: true } : {}) })),
        },
      });
      if (!result.ok) return result.error;
      if (result.data.id) setPathId(result.data.id);
      toast.success('Submission form saved. Applicants see these questions once the call is published.');
      router.refresh();
    });
  }

  return (
    <form className="grid gap-6" onSubmit={(event) => { event.preventDefault(); save(); }} aria-describedby="form-builder-help">
      <p id="form-builder-help" className="text-sm text-muted-foreground">Questions appear to applicants in this order. Existing questions keep their identity when you rename or reorder them.</p>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="form-categories">Categories <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
          <Input id="form-categories" value={categories} disabled={!canEdit} placeholder="e.g. Fiction, Poetry" aria-describedby="form-categories-help" onChange={(event) => setCategories(event.target.value)} />
          <FieldDescription id="form-categories-help">Separate categories with commas. Applicants choose one when the form has a category question.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="form-fee">Application fee in US dollars <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
          <Input id="form-fee" type="number" inputMode="decimal" min="0" step="0.01" value={fee} disabled={!canEdit} aria-describedby="form-fee-help" onChange={(event) => setFee(event.target.value)} />
          <FieldDescription id="form-fee-help">Leave empty for a free application.</FieldDescription>
        </Field>
      </FieldGroup>

      <FieldSet>
        <FieldLegend>Questions</FieldLegend>
        <ol className="grid gap-3">
          {fields.map((field, index) => (
            <li key={field.key} className="grid gap-3 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Question {index + 1}</p>
                {canEdit ? (
                  <div className="flex gap-1">
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" /></Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={`Move question ${index + 1} down`} disabled={index === fields.length - 1} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" /></Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove question ${index + 1}`} disabled={fields.length === 1} onClick={() => setFields((current) => current.filter((item) => item.key !== field.key))}><Trash2 aria-hidden="true" /></Button>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                <Field>
                  <FieldLabel htmlFor={`${field.key}-type`}>Answer type</FieldLabel>
                  <NativeSelect id={`${field.key}-type`} className="w-full" value={field.type} disabled={!canEdit} onChange={(event) => update(field.key, { type: event.target.value as FieldType })}>
                    {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => <NativeSelectOption key={type} value={type}>{FIELD_TYPE_LABELS[type]}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${field.key}-label`}>Label</FieldLabel>
                  <Input id={`${field.key}-label`} value={field.label} required maxLength={200} disabled={!canEdit} onChange={(event) => update(field.key, { label: event.target.value })} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={`${field.key}-help`}>Help text <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                <Input id={`${field.key}-help`} value={field.helpText} maxLength={1000} disabled={!canEdit} onChange={(event) => update(field.key, { helpText: event.target.value })} />
              </Field>
              <Field orientation="horizontal">
                <Checkbox id={`${field.key}-required`} checked={field.required} disabled={!canEdit} onCheckedChange={(checked) => update(field.key, { required: checked === true })} />
                <FieldLabel htmlFor={`${field.key}-required`} className="font-normal">Applicants must answer this question</FieldLabel>
              </Field>
            </li>
          ))}
        </ol>
        {canEdit ? <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setFields((current) => [...current, { key: nextKey(), type: 'text', label: '', helpText: '', required: false }])}><Plus aria-hidden="true" />Add question</Button> : null}
      </FieldSet>

      <FieldSet>
        <FieldLegend>Kinds of work</FieldLegend>
        <FieldDescription>Say which kinds of work this call accepts, prefers, requires or excludes, so applicants see the right form and your team can route submissions consistently.</FieldDescription>
        {rules.length ? (
          <ul className="grid gap-3">
            {rules.map((item, index) => (
              <li key={item.key} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor={`${item.key}-term`}>Kind of work {index + 1}</FieldLabel>
                  <NativeSelect id={`${item.key}-term`} className="w-full" value={item.termId} disabled={!canEdit} onChange={(event) => setRules((current) => current.map((rule) => (rule.key === item.key ? { ...rule, termId: event.target.value } : rule)))}>
                    <NativeSelectOption value="">Choose a kind of work</NativeSelectOption>
                    {SUBMISSION_TAXONOMY_OPTIONS.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${item.key}-rule`}>Rule</FieldLabel>
                  <NativeSelect id={`${item.key}-rule`} className="w-full" value={item.rule} disabled={!canEdit} onChange={(event) => setRules((current) => current.map((rule) => (rule.key === item.key ? { ...rule, rule: event.target.value as Rule } : rule)))}>
                    {(Object.keys(RULE_LABELS) as Rule[]).map((rule) => <NativeSelectOption key={rule} value={rule}>{RULE_LABELS[rule]}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
                {canEdit ? <Button type="button" size="sm" variant="ghost" onClick={() => setRules((current) => current.filter((rule) => rule.key !== item.key))}>Remove<span className="sr-only"> kind of work {index + 1}</span></Button> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No kinds of work named yet.</p>}
        {canEdit ? <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setRules((current) => [...current, { key: nextKey(), termId: '', rule: 'accepted' }])}><Plus aria-hidden="true" />Add kind of work</Button> : null}
      </FieldSet>

      <OrganizationActionError message={error} title="Form not saved" />
      {canEdit ? <Button type="submit" className="self-start" disabled={pending}><PendingLabel pending={pending} idle={<><Save aria-hidden="true" />Save submission form</>} busy="Saving…" /></Button> : null}
    </form>
  );
}
