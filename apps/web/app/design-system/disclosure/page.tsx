import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Accordion01 from '@/components/shadcn-studio/accordion/accordion-01'
import Accordion02 from '@/components/shadcn-studio/accordion/accordion-02'
import Accordion03 from '@/components/shadcn-studio/accordion/accordion-03'
import Accordion04 from '@/components/shadcn-studio/accordion/accordion-04'
import Accordion05 from '@/components/shadcn-studio/accordion/accordion-05'
import Accordion06 from '@/components/shadcn-studio/accordion/accordion-06'
import Accordion07 from '@/components/shadcn-studio/accordion/accordion-07'
import Accordion08 from '@/components/shadcn-studio/accordion/accordion-08'
import Accordion09 from '@/components/shadcn-studio/accordion/accordion-09'
import Accordion10 from '@/components/shadcn-studio/accordion/accordion-10'
import Accordion11 from '@/components/shadcn-studio/accordion/accordion-11'
import Accordion12 from '@/components/shadcn-studio/accordion/accordion-12'
import Accordion13 from '@/components/shadcn-studio/accordion/accordion-13'
import Accordion14 from '@/components/shadcn-studio/accordion/accordion-14'
import Accordion15 from '@/components/shadcn-studio/accordion/accordion-15'
import Collapsible01 from '@/components/shadcn-studio/collapsible/collapsible-01'
import Collapsible02 from '@/components/shadcn-studio/collapsible/collapsible-02'
import Collapsible03 from '@/components/shadcn-studio/collapsible/collapsible-03'
import Collapsible04 from '@/components/shadcn-studio/collapsible/collapsible-04'
import Collapsible05 from '@/components/shadcn-studio/collapsible/collapsible-05'
import Collapsible06 from '@/components/shadcn-studio/collapsible/collapsible-06'
import Collapsible07 from '@/components/shadcn-studio/collapsible/collapsible-07'
import Collapsible08 from '@/components/shadcn-studio/collapsible/collapsible-08'
import Collapsible09 from '@/components/shadcn-studio/collapsible/collapsible-09'
import Collapsible10 from '@/components/shadcn-studio/collapsible/collapsible-10'

export const metadata: Metadata = {
  title: 'Disclosure family · Missa design review',
  robots: {
    index: false,
    follow: false,
  },
}

type Reference = {
  id: string
  label: string
  note: string
  Component: ComponentType
}

const accordionReferences: Reference[] = [
  { id: '01', label: 'Default accordion', note: 'Baseline disclosure', Component: Accordion01 },
  { id: '02', label: 'Split accordion', note: 'Separated trigger', Component: Accordion02 },
  { id: '03', label: 'Left icon', note: 'Icon placement', Component: Accordion03 },
  { id: '04', label: 'Plus and minus icon', note: 'Open state', Component: Accordion04 },
  { id: '05', label: 'Active item', note: 'Emphasized state', Component: Accordion05 },
  { id: '06', label: 'Expand icon', note: 'Expanded state', Component: Accordion06 },
  { id: '07', label: 'Avatar accordion', note: 'People context', Component: Accordion07 },
  { id: '08', label: 'Icon and subtitle', note: 'Supporting context', Component: Accordion08 },
  { id: '09', label: 'Outline accordion', note: 'Contained surface', Component: Accordion09 },
  { id: '10', label: 'Box accordion', note: 'Grouped surface', Component: Accordion10 },
  { id: '11', label: 'Tabs accordion', note: 'Tabbed treatment', Component: Accordion11 },
  { id: '12', label: 'Outline tabs', note: 'Tabbed treatment', Component: Accordion12 },
  { id: '13', label: 'Media content', note: 'Rich content', Component: Accordion13 },
  { id: '14', label: 'Filled accordion', note: 'Emphasized surface', Component: Accordion14 },
  { id: '15', label: 'Multilevel accordion', note: 'Nested disclosure', Component: Accordion15 },
]

const collapsibleReferences: Reference[] = [
  { id: '01', label: 'Default collapsible', note: 'Baseline disclosure', Component: Collapsible01 },
  { id: '02', label: 'File tree', note: 'Nested navigation', Component: Collapsible02 },
  { id: '03', label: 'Task list', note: 'Progressive list', Component: Collapsible03 },
  { id: '04', label: 'Profile list', note: 'People context', Component: Collapsible04 },
  { id: '05', label: 'Filter panel', note: 'Advanced filters', Component: Collapsible05 },
  { id: '06', label: 'Show more FAQ', note: 'Progressive content', Component: Collapsible06 },
  { id: '07', label: 'Collapsible card', note: 'Contained surface', Component: Collapsible07 },
  { id: '08', label: 'Dropdown menu', note: 'Nested controls', Component: Collapsible08 },
  { id: '09', label: 'Collapsible form', note: 'Progressive form', Component: Collapsible09 },
  { id: '10', label: 'Animated disclosure', note: 'Special treatment', Component: Collapsible10 },
]

function ReferenceGrid({ references }: { references: Reference[] }) {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-80 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
            <div className='mb-6 flex items-start justify-between gap-4'>
              <div>
                <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                  {reference.id}
                </p>
                <h3 className='mt-1 text-sm font-semibold'>{reference.label}</h3>
              </div>
              <span className='shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground'>
                {reference.note}
              </span>
            </div>
            <div className='flex min-h-56 flex-1 items-center justify-center overflow-auto rounded-xl bg-muted/40 p-5'>
              <div className='flex w-full min-w-0 justify-center'>
                <Demo />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

const rules = [
  ['Disclose the right amount', 'Use Accordion for related sections where comparing headings is useful; use Collapsible for one optional region.'],
  ['Keep the trigger complete', 'The trigger should explain what opens and remain usable with keyboard, touch, and assistive technology.'],
  ['Preserve context', 'Opening content must not silently move people away from their place or hide the state of the surrounding workflow.'],
  ['Motion supports meaning', 'Animate height or icon state only when it clarifies the transition; reduced-motion behavior remains respected.'],
]

const sections = [
  {
    id: 'accordion-family',
    title: 'Accordion family',
    description: 'FAQs, structured sections, rich content, nested levels, and alternate open-state treatments.',
    references: accordionReferences,
  },
  {
    id: 'collapsible-family',
    title: 'Collapsible family',
    description: 'Progressive disclosure for filters, lists, cards, forms, menus, and optional detail.',
    references: collapsibleReferences,
  },
]

export default function DisclosureDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Disclosure should reduce noise, not hide meaning.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 15 premium Accordion and 10 premium Collapsible references are installed here for
            review. This is a local library surface only; nothing has been promoted into product
            routes.
          </p>
        </header>

        <section className='mt-12 space-y-16'>
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <h2 id={section.id} className='text-2xl font-semibold tracking-tight'>
                    {section.title}
                  </h2>
                  <p className='mt-1 text-sm text-muted-foreground'>{section.description}</p>
                </div>
                <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
                  {section.references.length} references
                </p>
              </div>
              <ReferenceGrid references={section.references} />
            </section>
          ))}
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='disclosure-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='disclosure-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa disclosure rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down content hierarchy, URL and state persistence, keyboard behavior, focus
              handling, and reduced-motion behavior as one coherent contract.
            </p>
          </div>
          <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {rules.map(([title, description]) => (
              <div key={title} className='rounded-2xl border bg-background p-5'>
                <h3 className='font-semibold'>{title}</h3>
                <p className='mt-2 text-sm leading-6 text-muted-foreground'>{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
