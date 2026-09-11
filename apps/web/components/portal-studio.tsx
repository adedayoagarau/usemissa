'use client';

import { useMemo, useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, FileText, Globe2, History, Palette, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import type { ConfigurationStatus, FormDefinition, FormField, PortalConfiguration, RelationalFormVersionView, RelationalOpenCallView, RelationalPortalConfigurationView, RelationalReviewWorkflowVersionView, ReviewWorkflowDefinition } from '@missa/workspace-engine';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import styles from './portal-studio.module.css';

type PortalTemplateChoice = { id: 'poetry-prize' | 'residency'; name: string; portal: PortalConfiguration };
type PortalStudioProps = {
  organizationId: string;
  organizationName: string;
  configurations: RelationalPortalConfigurationView[];
  forms: RelationalFormVersionView[];
  openCalls: RelationalOpenCallView[];
  workflows: RelationalReviewWorkflowVersionView[];
  templates: PortalTemplateChoice[];
};

const editableStatuses: readonly ConfigurationStatus[] = ['draft', 'in-review', 'approved'];
const nextStatus: Partial<Record<ConfigurationStatus, ConfigurationStatus>> = { draft: 'in-review', 'in-review': 'approved', approved: 'published' };
const actionLabel: Partial<Record<ConfigurationStatus, string>> = { 'in-review': 'Send for review', approved: 'Approve', published: 'Publish portal' };

function requestHeaders(): HeadersInit {
  return { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() };
}

function newFormField(type: FormField['type'], order: number): FormField {
  const shared = { id: crypto.randomUUID(), label: 'Untitled question', required: false, visibility: ['applicant', 'organization', 'reviewer'] as const, order };
  switch (type) {
    case 'short-text': return { ...shared, type, maxLength: 300 };
    case 'long-text': return { ...shared, type, maxWords: 500 };
    case 'number': return { ...shared, type };
    case 'date': return { ...shared, type };
    case 'email': return { ...shared, type };
    case 'url': return { ...shared, type };
    case 'checkbox': return { ...shared, type, acknowledgment: 'I confirm this statement.' };
    case 'single-choice': return { ...shared, type, options: [{ id: crypto.randomUUID(), label: 'Option 1' }] };
    case 'multiple-choice': return { ...shared, type, options: [{ id: crypto.randomUUID(), label: 'Option 1' }] };
    case 'file-upload': return { ...shared, type, acceptedTypes: ['application/pdf'], maximumBytes: 25_000_000, maximumFiles: 1 };
    case 'display': return { ...shared, type, required: false, content: 'Add instructions for applicants.' };
  }
}

export function PortalStudio({ organizationId, organizationName, configurations: initialConfigurations, forms, openCalls, workflows, templates }: PortalStudioProps) {
  const current = initialConfigurations.find((item) => editableStatuses.includes(item.status)) ?? initialConfigurations.find((item) => item.status === 'published');
  const fallback = templates[0]!.portal;
  const [configuration, setConfiguration] = useState<PortalConfiguration>(current?.configuration ?? { ...fallback, name: organizationName });
  const [version, setVersion] = useState(current);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const initialForm = forms.find((item) => editableStatuses.includes(item.status)) ?? forms[0];
  const [formVersion, setFormVersion] = useState<RelationalFormVersionView | undefined>(initialForm);
  const [formKey, setFormKey] = useState(initialForm?.definitionKey ?? 'application');
  const [formDefinition, setFormDefinition] = useState<FormDefinition>(initialForm?.definition ?? { name: 'Application form', purpose: 'application', fields: [] });
  const [fieldType, setFieldType] = useState<FormField['type']>('short-text');
  const [formMessage, setFormMessage] = useState<string>();
  const [logoFile, setLogoFile] = useState<File>();
  const initialWorkflow = workflows[0];
  const [workflowVersion, setWorkflowVersion] = useState<RelationalReviewWorkflowVersionView | undefined>(initialWorkflow);
  const [workflowDefinition, setWorkflowDefinition] = useState<ReviewWorkflowDefinition>(initialWorkflow?.definition ?? { name: 'Review workflow', stages: [] });
  const [workflowMessage, setWorkflowMessage] = useState<string>();
  const published = initialConfigurations.find((item) => item.status === 'published');
  const statusToApply = version ? nextStatus[version.status] : undefined;
  const groupedForms = useMemo(() => {
    const groups = new Map<string, RelationalFormVersionView[]>();
    for (const form of forms) groups.set(form.definitionKey, [...(groups.get(form.definitionKey) ?? []), form]);
    return groups;
  }, [forms]);
  const formStatusToApply = formVersion ? nextStatus[formVersion.status] : undefined;

  const update = <Key extends keyof PortalConfiguration>(key: Key, value: PortalConfiguration[Key]) => setConfiguration((portal) => ({ ...portal, [key]: value }));
  const updateBrand = <Key extends keyof PortalConfiguration['brand']>(key: Key, value: PortalConfiguration['brand'][Key]) => setConfiguration((portal) => ({ ...portal, brand: { ...portal.brand, [key]: value || undefined } }));

  const save = () => startTransition(async () => {
    setError(undefined);
    setMessage(undefined);
    let nextConfiguration = configuration;
    if (logoFile) {
      const uploadBody = new FormData();
      uploadBody.set('file', logoFile);
      const upload = await fetch(`/api/orgs/${organizationId}/portal-assets/logo`, { method: 'POST', body: uploadBody });
      const uploaded = await upload.json() as { url?: string; error?: string };
      if (!upload.ok || !uploaded.url) {
        setError(uploaded.error ?? 'The logo could not be uploaded.');
        return;
      }
      nextConfiguration = { ...configuration, brand: { ...configuration.brand, logoUrl: uploaded.url } };
      setConfiguration(nextConfiguration);
      setLogoFile(undefined);
    }
    const response = await fetch(version && editableStatuses.includes(version.status)
      ? `/api/orgs/${organizationId}/portal-configurations/${version.id}`
      : `/api/orgs/${organizationId}/portal-configurations`, {
      method: version && editableStatuses.includes(version.status) ? 'PATCH' : 'POST',
      headers: requestHeaders(),
      body: JSON.stringify(version && editableStatuses.includes(version.status) ? { configuration: nextConfiguration, expectedRevision: version.revision } : nextConfiguration),
    });
    const body = await response.json() as { id?: string; revision?: number; error?: string };
    if (!response.ok || !body.id || !body.revision) {
      setError(body.error ?? 'The portal draft could not be saved.');
      return;
    }
    setVersion({
      id: body.id,
      organizationId,
      version: version?.version ?? (initialConfigurations[0]?.version ?? 0) + 1,
      status: version && editableStatuses.includes(version.status) ? version.status : 'draft',
      configuration: nextConfiguration,
      revision: body.revision,
      createdAt: version?.createdAt ?? new Date().toISOString(),
    });
    setMessage('Portal draft saved.');
  });

  const transition = () => {
    if (!version || !statusToApply) return;
    startTransition(async () => {
      setError(undefined);
      setMessage(undefined);
      const response = await fetch(`/api/orgs/${organizationId}/portal-configurations/${version.id}/transition`, {
        method: 'POST',
        headers: requestHeaders(),
        body: JSON.stringify({ status: statusToApply, expectedRevision: version.revision }),
      });
      const body = await response.json() as { revision?: number; error?: string };
      if (!response.ok || !body.revision) {
        setError(body.error ?? 'The portal status could not be changed.');
        return;
      }
      setVersion({ ...version, status: statusToApply, revision: body.revision, configuration });
      setMessage(statusToApply === 'published' ? 'Portal published for new applicants.' : `Portal moved to ${statusToApply}.`);
    });
  };

  const saveForm = () => startTransition(async () => {
    setError(undefined);
    setFormMessage(undefined);
    const editable = formVersion && editableStatuses.includes(formVersion.status);
    const response = await fetch(editable ? `/api/orgs/${organizationId}/form-versions/${formVersion.id}` : `/api/orgs/${organizationId}/form-versions`, {
      method: editable ? 'PATCH' : 'POST',
      headers: requestHeaders(),
      body: JSON.stringify(editable ? { definition: formDefinition, expectedRevision: formVersion.revision } : { definitionKey: formKey, definition: formDefinition }),
    });
    const body = await response.json() as { id?: string; revision?: number; error?: string };
    if (!response.ok || !body.id || !body.revision) {
      setError(body.error ?? 'The form draft could not be saved.');
      return;
    }
    setFormVersion({
      id: body.id, organizationId, definitionKey: formKey,
      version: formVersion?.version ?? Math.max(0, ...forms.filter((item) => item.definitionKey === formKey).map((item) => item.version)) + 1,
      status: editable ? formVersion.status : 'draft', definition: formDefinition, revision: body.revision,
      createdAt: formVersion?.createdAt ?? new Date().toISOString(),
    });
    setFormMessage('Form draft saved.');
  });

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= formDefinition.fields.length) return;
    const fields = [...formDefinition.fields];
    [fields[index], fields[target]] = [fields[target]!, fields[index]!];
    setFormDefinition({ ...formDefinition, fields: fields.map((field, order) => ({ ...field, order })) });
  };

  const transitionForm = () => {
    if (!formVersion || !formStatusToApply) return;
    startTransition(async () => {
      setError(undefined);
      setFormMessage(undefined);
      const response = await fetch(`/api/orgs/${organizationId}/form-versions/${formVersion.id}/transition`, {
        method: 'POST', headers: requestHeaders(),
        body: JSON.stringify({ status: formStatusToApply, expectedRevision: formVersion.revision }),
      });
      const body = await response.json() as { revision?: number; error?: string };
      if (!response.ok || !body.revision) {
        setError(body.error ?? 'The form status could not be changed.');
        return;
      }
      setFormVersion({ ...formVersion, status: formStatusToApply, revision: body.revision, definition: formDefinition });
      setFormMessage(formStatusToApply === 'published' ? 'Form published for future drafts.' : `Form moved to ${formStatusToApply}.`);
    });
  };

  const saveWorkflow = () => startTransition(async () => {
    if (!workflowVersion) return;
    setWorkflowMessage(undefined);
    const response = await fetch(`/api/orgs/${organizationId}/open-calls/${workflowVersion.openCallId}/review-workflow-versions/${workflowVersion.id}`, {
      method: 'PATCH', headers: requestHeaders(), body: JSON.stringify({ definition: workflowDefinition, expectedRevision: workflowVersion.revision }),
    });
    const body = await response.json() as { revision?: number; error?: string };
    if (!response.ok || !body.revision) { setError(body.error ?? 'The review workflow could not be saved.'); return; }
    setWorkflowVersion({ ...workflowVersion, definition: workflowDefinition, revision: body.revision });
    setWorkflowMessage('Review workflow draft saved.');
  });

  const transitionWorkflow = () => startTransition(async () => {
    if (!workflowVersion) return;
    const status = nextStatus[workflowVersion.status];
    if (!status) return;
    const response = await fetch(`/api/orgs/${organizationId}/open-calls/${workflowVersion.openCallId}/review-workflow-versions/${workflowVersion.id}/transition`, { method: 'POST', headers: requestHeaders(), body: JSON.stringify({ status, expectedRevision: workflowVersion.revision }) });
    const body = await response.json() as { revision?: number; error?: string };
    if (!response.ok || !body.revision) { setError(body.error ?? 'The review workflow status could not be changed.'); return; }
    setWorkflowVersion({ ...workflowVersion, status, revision: body.revision });
    setWorkflowMessage(status === 'published' ? 'Review workflow published.' : `Review workflow moved to ${status}.`);
  });

  return <main className={styles.main}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Submission portal</p><h1 className="font-heading">Shape the applicant’s front door</h1><p>Write the public identity once, inspect it as an applicant, then publish an immutable version when the Organization is ready.</p></div><div className={styles.headerActions}><span data-status={version?.status ?? 'new'}>{version ? `Version ${version.version} · ${version.status}` : 'New draft'}</span>{published ? <a href={`/org/${encodeURIComponent(organizationId)}`} target="_blank" rel="noreferrer">Open live portal <ExternalLink aria-hidden="true" /></a> : null}</div></header>
    <aside className={styles.boundary}><ShieldCheck aria-hidden="true" /><div><strong>Publishing changes future drafts only</strong><p>Existing applications stay pinned to the version they began with. A published version cannot be edited in place.</p></div></aside>

    <Tabs defaultValue="identity" className={styles.tabs}>
      <TabsList variant="line" aria-label="Portal builder sections"><TabsTrigger value="identity"><Palette />Identity</TabsTrigger><TabsTrigger value="forms"><FileText />Forms</TabsTrigger><TabsTrigger value="opportunities"><Globe2 />Opportunities</TabsTrigger><TabsTrigger value="history"><History />Versions</TabsTrigger></TabsList>
      <TabsContent value="identity" className={styles.workspace}>
        <section className={styles.editor} aria-labelledby="identity-title"><header><p className={styles.eyebrow}>Public identity</p><h2 id="identity-title">What applicants will know</h2><p>Start from a vertical template or write the Organization’s own public portal language.</p></header>
          <div className={styles.templates}>{templates.map((template) => <Button key={template.id} type="button" variant="outline" size="sm" disabled={isPending} onClick={() => { setConfiguration({ ...template.portal, name: organizationName }); setMessage(`${template.name} structure loaded into this unsaved draft.`); }}>{template.name}</Button>)}</div>
          <FieldGroup>
            <Field><FieldLabel htmlFor="portal-name">Portal name</FieldLabel><Input id="portal-name" value={configuration.name} maxLength={120} onChange={(event) => update('name', event.target.value)} /></Field>
            <Field><FieldLabel htmlFor="portal-introduction">Introduction</FieldLabel><Textarea id="portal-introduction" value={configuration.introduction ?? ''} maxLength={2_000} rows={5} onChange={(event) => update('introduction', event.target.value || undefined)} /><FieldDescription>Keep eligibility and deadline rules with the Opportunity; this is the Organization welcome.</FieldDescription></Field>
            <div className={styles.twoColumns}><Field><FieldLabel htmlFor="support-email">Support email</FieldLabel><Input id="support-email" type="email" value={configuration.supportEmail} onChange={(event) => update('supportEmail', event.target.value)} /></Field><Field><FieldLabel htmlFor="time-zone">Time zone</FieldLabel><Input id="time-zone" value={configuration.timeZone} onChange={(event) => update('timeZone', event.target.value)} /><FieldDescription>Use an IANA zone such as Africa/Lagos.</FieldDescription></Field></div>
            <div className={styles.twoColumns}><Field><FieldLabel htmlFor="privacy-url">Privacy policy</FieldLabel><Input id="privacy-url" type="url" value={configuration.privacyPolicyUrl} onChange={(event) => update('privacyPolicyUrl', event.target.value)} /></Field><Field><FieldLabel htmlFor="terms-url">Terms</FieldLabel><Input id="terms-url" type="url" value={configuration.termsUrl} onChange={(event) => update('termsUrl', event.target.value)} /></Field></div>
            <div className={styles.twoColumns}><Field><FieldLabel htmlFor="logo-file">Upload logo</FieldLabel><Input id="logo-file" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => setLogoFile(event.target.files?.[0])} /><FieldDescription>{logoFile ? `${logoFile.name} ready to upload` : 'JPG, PNG, WebP or SVG · 5 MB maximum'}</FieldDescription></Field><Field><FieldLabel htmlFor="logo-alt">Logo description</FieldLabel><Input id="logo-alt" value={configuration.brand.logoAlt ?? ''} onChange={(event) => updateBrand('logoAlt', event.target.value)} /></Field></div>
            <Field><FieldLabel htmlFor="brand-color">Primary brand color</FieldLabel><Input id="brand-color" value={configuration.brand.primaryColor ?? ''} placeholder="Six-digit hex color" onChange={(event) => updateBrand('primaryColor', event.target.value)} /><FieldDescription>Missa preserves contrast and layout; this color is used only for approved emphasis.</FieldDescription></Field>
          </FieldGroup>
          <footer className={styles.actions}><Button type="button" variant="outline" disabled={isPending} onClick={save}><Save />{isPending ? 'Working…' : 'Save draft'}</Button>{statusToApply ? <Button type="button" disabled={isPending} onClick={transition}>{statusToApply === 'published' ? <Globe2 /> : <Check />}{actionLabel[statusToApply]}</Button> : null}</footer>
          {message ? <p className={styles.success} role="status">{message}</p> : null}{error ? <p className={styles.error} role="alert">{error}</p> : null}
        </section>
        <aside className={styles.preview} aria-label="Applicant portal preview"><header><span><Eye aria-hidden="true" />Applicant preview</span><small>Unsaved draft</small></header><div className={styles.previewPage}>{configuration.brand.logoUrl ? <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the versioned Organization logo may use any validated HTTPS host */}
          <img src={configuration.brand.logoUrl} alt={configuration.brand.logoAlt ?? ''} />
        </> : <span className={`${styles.wordmark} font-heading`}>{configuration.name.slice(0, 1).toUpperCase()}</span>}<p>Applications managed with Missa</p><h2 className="font-heading">{configuration.name || 'Untitled portal'}</h2><p>{configuration.introduction || 'Add an introduction to tell applicants what this Organization supports.'}</p><button type="button" style={{ backgroundColor: configuration.brand.primaryColor ?? 'var(--primary)' }}>View open opportunities</button><dl><div><dt>Support</dt><dd>{configuration.supportEmail || 'Not set'}</dd></div><div><dt>Time zone</dt><dd>{configuration.timeZone || 'Not set'}</dd></div></dl></div></aside>
      </TabsContent>
      <TabsContent value="forms" className={styles.formBuilder}>
        <aside className={styles.formList}><header><p className={styles.eyebrow}>Forms</p><h2>{forms.length} versions</h2></header>{groupedForms.size ? [...groupedForms].map(([key, versions]) => <button key={key} type="button" data-active={key === formKey} onClick={() => { const selected = versions[0]!; setFormKey(key); setFormVersion(selected); setFormDefinition(selected.definition); }}><strong>{versions[0]!.definition.name}</strong><span>{key} · v{versions[0]!.version} · {versions[0]!.status}</span></button>) : <p>No saved forms yet.</p>}<Button type="button" variant="outline" size="sm" onClick={() => { setFormKey('application'); setFormVersion(undefined); setFormDefinition({ name: 'Application form', purpose: 'application', fields: [] }); }}><Plus />New form</Button>{formVersion && !editableStatuses.includes(formVersion.status) ? <Button type="button" variant="outline" size="sm" onClick={() => setFormVersion(undefined)}><History />New version from this form</Button> : null}</aside>
        <section className={styles.formEditor}><header><div><p className={styles.eyebrow}>Question builder</p><h2>{formDefinition.name}</h2></div><span>{formVersion ? `v${formVersion.version} · ${formVersion.status}` : 'New draft'}</span></header>
          <div className={styles.formMeta}><Field><FieldLabel htmlFor="form-key">Stable form key</FieldLabel><Input id="form-key" value={formKey} disabled={Boolean(formVersion)} onChange={(event) => setFormKey(event.target.value)} /></Field><Field><FieldLabel htmlFor="form-name">Form name</FieldLabel><Input id="form-name" value={formDefinition.name} onChange={(event) => setFormDefinition({ ...formDefinition, name: event.target.value })} /></Field><Field><FieldLabel htmlFor="form-purpose">Purpose</FieldLabel><NativeSelect id="form-purpose" className="w-full" value={formDefinition.purpose} onChange={(event) => setFormDefinition({ ...formDefinition, purpose: event.target.value as FormDefinition['purpose'] })}><option value="application">Application</option><option value="eligibility">Eligibility</option><option value="review">Review</option><option value="work">Work</option><option value="reference">Reference</option><option value="additional-information">Additional information</option><option value="internal">Internal</option><option value="delivery">Delivery</option></NativeSelect></Field></div>
          <ol className={styles.fields}>{formDefinition.fields.map((field, index) => <li key={field.id}><div className={styles.fieldOrder}><Button type="button" variant="ghost" size="icon-xs" aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => moveField(index, -1)}><ArrowUp /></Button><span>{index + 1}</span><Button type="button" variant="ghost" size="icon-xs" aria-label={`Move ${field.label} down`} disabled={index === formDefinition.fields.length - 1} onClick={() => moveField(index, 1)}><ArrowDown /></Button></div><div className={styles.fieldBody}><span>{field.type.replaceAll('-', ' ')}</span><Input aria-label={`Question ${index + 1} label`} value={field.label} onChange={(event) => setFormDefinition({ ...formDefinition, fields: formDefinition.fields.map((item) => item.id === field.id ? { ...item, label: event.target.value } : item) })} /><label><Checkbox checked={field.required} disabled={field.type === 'display'} onCheckedChange={(checked) => setFormDefinition({ ...formDefinition, fields: formDefinition.fields.map((item) => {
            if (item.id !== field.id || item.type === 'display') return item;
            return { ...item, required: checked === true };
          }) })} />Required</label></div><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${field.label}`} onClick={() => setFormDefinition({ ...formDefinition, fields: formDefinition.fields.filter((item) => item.id !== field.id).map((item, order) => ({ ...item, order })) })}><Trash2 /></Button></li>)}</ol>
          {!formDefinition.fields.length ? <div className={styles.empty}><FileText /><h3>No questions yet</h3><p>Add only what the Organization needs to evaluate or operate this Opportunity.</p></div> : null}
          <div className={styles.addField}><NativeSelect aria-label="Question type" value={fieldType} onChange={(event) => setFieldType(event.target.value as FormField['type'])}><option value="short-text">Short text</option><option value="long-text">Long text</option><option value="number">Number</option><option value="date">Date</option><option value="email">Email</option><option value="url">URL</option><option value="checkbox">Acknowledgment</option><option value="single-choice">Single choice</option><option value="multiple-choice">Multiple choice</option><option value="file-upload">File upload</option><option value="display">Instructions</option></NativeSelect><Button type="button" variant="outline" size="sm" onClick={() => setFormDefinition({ ...formDefinition, fields: [...formDefinition.fields, newFormField(fieldType, formDefinition.fields.length)] })}><Plus />Add question</Button></div>
          <footer className={styles.actions}><Button type="button" variant="outline" disabled={isPending || !editableStatuses.includes(formVersion?.status ?? 'draft')} onClick={saveForm}><Save />{isPending ? 'Working…' : 'Save form draft'}</Button>{formStatusToApply ? <Button type="button" disabled={isPending} onClick={transitionForm}>{formStatusToApply === 'published' ? <Globe2 /> : <Check />}{actionLabel[formStatusToApply]}</Button> : null}</footer>{formMessage ? <p className={styles.success} role="status">{formMessage}</p> : null}{error ? <p className={styles.error} role="alert">{error}</p> : null}
        </section>
      </TabsContent>
      <TabsContent value="opportunities" className={styles.inventory}><header><div><p className={styles.eyebrow}>Programs</p><h2>Opportunity configuration</h2></div><span>{openCalls.length} records</span></header>{openCalls.length ? openCalls.map((call) => { const workflow = workflows.find((item) => item.openCallId === call.id); return <article key={call.id}><div><strong>{call.title}</strong><span>Open Call · {call.status} · {workflow ? `${workflow.definition.stages.length} review stages` : 'No workflow'}</span></div><Button type="button" variant="outline" size="sm" onClick={() => { if (workflow) { setWorkflowVersion(workflow); setWorkflowDefinition(workflow.definition); } }}>{workflow ? 'Edit workflow' : 'Workflow unavailable'}</Button><a href={`/organization/${encodeURIComponent(organizationId)}/opportunities/${encodeURIComponent(call.id)}`}>Open Opportunity <ExternalLink /></a></article>; }) : <div className={styles.empty}><Globe2 /><h3>No Opportunities yet</h3><p>Create an Opportunity before connecting a form and review workflow.</p></div>}{workflowVersion ? <section className={styles.workflowEditor}><header><div><p className={styles.eyebrow}>Review workflow</p><h3>{workflowDefinition.name}</h3></div><span>{workflowVersion.status}</span></header><Field><FieldLabel htmlFor="workflow-name">Workflow name</FieldLabel><Input id="workflow-name" value={workflowDefinition.name} onChange={(event) => setWorkflowDefinition({ ...workflowDefinition, name: event.target.value })} /></Field><ol className={styles.workflowStages}>{workflowDefinition.stages.map((stage, index) => <li key={stage.id}><span>{index + 1}</span><div><strong>{stage.name}</strong><small>{stage.type === 'custom-form' ? 'Custom review form' : stage.type === 'vote' ? 'Yes / No / Maybe vote' : 'No review required'} · {stage.requiredReviewCount} reviewer{stage.requiredReviewCount === 1 ? '' : 's'}</small></div><NativeSelect aria-label={`Review type for ${stage.name}`} value={stage.type} onChange={(event) => { const type = event.target.value as typeof stage.type; setWorkflowDefinition({ ...workflowDefinition, stages: workflowDefinition.stages.map((item) => item.id === stage.id ? type === 'vote' ? { ...item, type, choices: ['yes', 'no', 'maybe'] as const } : type === 'no-review' ? { ...item, type } : { ...item, type, reviewFormVersionId: forms.find((form) => form.definition.purpose === 'review')?.id ?? '' } : item) }); }}><option value="custom-form">Custom form</option><option value="vote">Vote</option><option value="no-review">No review</option></NativeSelect></li>)}</ol><div className={styles.addField}><Button type="button" variant="outline" size="sm" onClick={() => setWorkflowDefinition({ ...workflowDefinition, stages: [...workflowDefinition.stages, { id: crypto.randomUUID(), type: 'no-review', name: 'New stage', order: workflowDefinition.stages.length, requiredReviewCount: 1, blindMode: 'none', peerReviewVisibility: 'hidden' }] })}><Plus />Add stage</Button><Button type="button" disabled={isPending} onClick={saveWorkflow}><Save />Save workflow</Button>{nextStatus[workflowVersion.status] ? <Button type="button" variant="outline" disabled={isPending} onClick={transitionWorkflow}>{nextStatus[workflowVersion.status] === 'published' ? 'Publish workflow' : `Move to ${nextStatus[workflowVersion.status]}`}</Button> : null}</div>{workflowMessage ? <p className={styles.success} role="status">{workflowMessage}</p> : null}</section> : null}</TabsContent>
      <TabsContent value="history" className={styles.inventory}><header><div><p className={styles.eyebrow}>Publication record</p><h2>Portal versions</h2></div><span>{initialConfigurations.length} versions</span></header>{initialConfigurations.length ? initialConfigurations.map((item) => <article key={item.id}><div><strong>Version {item.version}</strong><span>{item.configuration.name}</span></div><span>{item.status}</span><small>Revision {item.revision}</small></article>) : <div className={styles.empty}><History /><h3>No saved versions</h3><p>The first save creates version 1 as a draft.</p></div>}</TabsContent>
    </Tabs>
  </main>;
}
