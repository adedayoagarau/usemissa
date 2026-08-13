'use client';

import { useState, useTransition } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './organization-opportunity-editor.module.css';

type Section = 'basics' | 'guidelines' | 'practice' | 'eligibility' | 'place' | 'dates' | 'fees' | 'form' | 'review';
type Opportunity = { id: string; title: string; status: 'draft' | 'published' | 'closed'; guidelineUrl?: string; guidelineText?: string };

const sections: Array<{ id: Section; label: string }> = [
  { id: 'basics', label: 'Basics' }, { id: 'guidelines', label: 'Guidelines' }, { id: 'practice', label: 'Field rules' }, { id: 'eligibility', label: 'Eligibility' }, { id: 'place', label: 'Place' }, { id: 'dates', label: 'Dates' }, { id: 'fees', label: 'Fees and terms' }, { id: 'form', label: 'Submission form' }, { id: 'review', label: 'Review and publish' },
];

export function OrganizationOpportunityEditor({ organizationId, opportunity, teamName, programName, canEdit, form }: { organizationId: string; opportunity: Opportunity; teamName: string; programName: string; canEdit: boolean; form?: { categories: string[]; fieldCount: number; practiceRuleCount: number; feeCents?: number } }) {
  const [section, setSection] = useState<Section>('basics');
  const [title, setTitle] = useState(opportunity.title);
  const [guidelineUrl, setGuidelineUrl] = useState(opportunity.guidelineUrl ?? '');
  const [guidelineText, setGuidelineText] = useState(opportunity.guidelineText ?? '');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  function save(payload: Record<string, string>) {
    setMessage('');
    startTransition(async () => {
      const response = await fetch(`/api/orgs/${encodeURIComponent(organizationId)}/open-calls/${encodeURIComponent(opportunity.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      setMessage(response.ok ? `${sections.find((item) => item.id === section)?.label} saved.` : body.error ?? 'This section could not be saved. Your edits remain here.');
    });
  }

  const unsupported: Record<Exclude<Section, 'basics' | 'guidelines' | 'practice' | 'fees' | 'form' | 'review'>, { title: string; copy: string }> = {
    eligibility: { title: 'Eligibility is not represented safely yet', copy: 'The current Organization record cannot store a dedicated eligibility projection. Missa will not infer who may apply from the guidelines.' },
    place: { title: 'Place is not represented safely yet', copy: 'Application reach, participation mode, and event location need their own saved facts. Missa will not infer them from the Program or Organization address.' },
    dates: { title: 'Dates are not represented safely yet', copy: 'The current Organization record cannot distinguish exact, rolling, until-filled, and unknown deadlines. This screen will not invent a date.' },
  };

  return <div className={styles.editor}><nav className={styles.sections} aria-label="Opportunity builder sections">{sections.map((item) => <button key={item.id} type="button" aria-current={section === item.id ? 'step' : undefined} onClick={() => { setSection(item.id); setMessage(''); }}>{item.label}</button>)}</nav><p className="sr-only" role="status" aria-live="polite">{message}</p>
    <section className={styles.panel} aria-labelledby={`opportunity-${section}`}>
      {section === 'basics' ? <><header className={styles.panelHeader}><p>Opportunity builder · Basics</p><h2 id="opportunity-basics">Basics</h2><p>Identity and Program scope currently available in the Organization record.</p></header><dl className={styles.facts}><div><dt>Team</dt><dd>{teamName}</dd></div><div><dt>Program</dt><dd>{programName}</dd></div></dl><form className={styles.form} onSubmit={(event) => { event.preventDefault(); save({ title }); }}><div><label htmlFor="edit-opportunity-title">Public title</label><input id="edit-opportunity-title" value={title} required maxLength={180} disabled={!canEdit} onChange={(event) => setTitle(event.target.value)} /><p>Opportunity type, public summary, and optional image are not yet stored by this Organization record.</p></div>{message ? <p role="alert">{message}</p> : null}{canEdit ? <Button type="submit" disabled={pending}><Save aria-hidden="true" />{pending ? 'Saving…' : 'Save Basics'}</Button> : <span className={styles.badge}>Read only</span>}</form></> : null}
      {section === 'guidelines' ? <><header className={styles.panelHeader}><p>Opportunity builder · Guidelines</p><h2 id="opportunity-guidelines">Guidelines</h2><p>The official URL and reviewed public text save independently.</p></header><form className={styles.form} onSubmit={(event) => { event.preventDefault(); save({ guidelineUrl, guidelineText }); }}><div><label htmlFor="edit-guideline-url">Official guidelines URL</label><input id="edit-guideline-url" type="url" value={guidelineUrl} disabled={!canEdit} onChange={(event) => setGuidelineUrl(event.target.value)} /><p>Use a public Organization page or document.</p></div><div><label htmlFor="edit-guideline-text">Public guidelines</label><textarea id="edit-guideline-text" value={guidelineText} disabled={!canEdit} onChange={(event) => setGuidelineText(event.target.value)} /><p>Imported text is only a draft until it is reviewed and saved.</p></div>{message ? <p role="alert">{message}</p> : null}{canEdit ? <Button type="submit" disabled={pending}><Save aria-hidden="true" />{pending ? 'Saving…' : 'Save Guidelines'}</Button> : <span className={styles.badge}>Read only</span>}</form></> : null}
      {section === 'practice' ? <><header className={styles.panelHeader}><p>Opportunity builder · Field rules</p><h2 id="opportunity-practice">Field rules</h2><p>Accepted creative work remains separate from eligibility, place, type, and application materials.</p></header><div className={styles.boundary}><h3>{form?.practiceRuleCount ?? 0} saved field rules</h3><p>The compatibility form can store canonical rule assignments, but this new Organization surface does not yet provide conflict-safe editing across all 12 facets.</p></div></> : null}
      {section === 'eligibility' || section === 'place' || section === 'dates' ? <><header className={styles.panelHeader}><p>Opportunity builder · {sections.find((item) => item.id === section)?.label}</p><h2 id={`opportunity-${section}`}>{unsupported[section].title}</h2><p>{unsupported[section].copy}</p></header><div className={styles.boundary}><h3>Publication boundary</h3><p>This missing domain remains a blocker for safe publication from the new Organization product.</p></div></> : null}
      {section === 'fees' ? <><header className={styles.panelHeader}><p>Opportunity builder · Fees and terms</p><h2 id="opportunity-fees">Fees and terms</h2><p>Application fee, currency, award, expenses, rights, payment, and refunds are independent facts.</p></header><div className={styles.boundary}><h3>{form?.feeCents === undefined ? 'No fee amount is stored' : 'A numeric fee amount is stored'}</h3><p>{form?.feeCents === undefined ? 'Unknown is not the same as free. No public fee statement should be inferred.' : 'The current record does not preserve currency or the wider commercial terms, so this amount is not publication-ready here.'}</p></div></> : null}
      {section === 'form' ? <><header className={styles.panelHeader}><p>Opportunity builder · Submission form</p><h2 id="opportunity-form">Submission form</h2><p>Categories, questions, Works, files, and required state belong to the applicant flow.</p></header><dl className={styles.facts}><div><dt>Categories</dt><dd>{form?.categories.length ?? 0}</dd></div><div><dt>Fields</dt><dd>{form?.fieldCount ?? 0}</dd></div></dl><div className={styles.boundary}><h3>Form editing is not migrated yet</h3><p>The existing saved form remains intact. This screen will not replace it until stable field identity, branching validation, and applicant-draft safety are available.</p></div></> : null}
      {section === 'review' ? <><header className={styles.panelHeader}><p>Opportunity builder · Review and publish</p><h2 id="opportunity-review">Review and publish</h2><p>Publishing is a consequential state transition, not a lifecycle toggle.</p></header><div className={styles.boundary}><h3>{opportunity.status === 'draft' ? 'Publication is blocked in this screen' : `Current lifecycle: ${opportunity.status}`}</h3><p>The new Organization product cannot yet prove readiness for all required public facts and the applicant flow. It therefore does not expose publish, close, or reopen controls.</p><ul><li>Eligibility, place, dates, and full commercial terms need dedicated records.</li><li>Field-rule conflicts and deprecated terms need typed validation.</li><li>The real applicant flow needs a safe preview before publication.</li></ul></div></> : null}
    </section>
  </div>;
}
