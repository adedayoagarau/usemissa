import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Autocomplete01 from '@/components/shadcn-studio/autocomplete/autocomplete-01'
import Autocomplete02 from '@/components/shadcn-studio/autocomplete/autocomplete-02'
import Autocomplete03 from '@/components/shadcn-studio/autocomplete/autocomplete-03'
import Autocomplete04 from '@/components/shadcn-studio/autocomplete/autocomplete-04'
import Autocomplete05 from '@/components/shadcn-studio/autocomplete/autocomplete-05'
import Autocomplete06 from '@/components/shadcn-studio/autocomplete/autocomplete-06'
import Autocomplete07 from '@/components/shadcn-studio/autocomplete/autocomplete-07'
import Autocomplete08 from '@/components/shadcn-studio/autocomplete/autocomplete-08'
import Autocomplete09 from '@/components/shadcn-studio/autocomplete/autocomplete-09'
import Autocomplete10 from '@/components/shadcn-studio/autocomplete/autocomplete-10'
import ButtonGroup01 from '@/components/shadcn-studio/button-group/button-group-01'
import ButtonGroup02 from '@/components/shadcn-studio/button-group/button-group-02'
import ButtonGroup03 from '@/components/shadcn-studio/button-group/button-group-03'
import ButtonGroup04 from '@/components/shadcn-studio/button-group/button-group-04'
import ButtonGroup05 from '@/components/shadcn-studio/button-group/button-group-05'
import ButtonGroup06 from '@/components/shadcn-studio/button-group/button-group-06'
import ButtonGroup07 from '@/components/shadcn-studio/button-group/button-group-07'
import ButtonGroup08 from '@/components/shadcn-studio/button-group/button-group-08'
import ButtonGroup09 from '@/components/shadcn-studio/button-group/button-group-09'
import ButtonGroup10 from '@/components/shadcn-studio/button-group/button-group-10'
import ButtonGroup11 from '@/components/shadcn-studio/button-group/button-group-11'
import ButtonGroup12 from '@/components/shadcn-studio/button-group/button-group-12'
import ButtonGroup13 from '@/components/shadcn-studio/button-group/button-group-13'
import ButtonGroup14 from '@/components/shadcn-studio/button-group/button-group-14'
import ButtonGroup15 from '@/components/shadcn-studio/button-group/button-group-15'
import ButtonGroup16 from '@/components/shadcn-studio/button-group/button-group-16'

export const metadata: Metadata = {
  title: 'Autocomplete and Button Group family · Missa design review',
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

function createReferences(components: ComponentType[], labels: string[], note: string): Reference[] {
  return components.map((Component, index) => ({
    id: String(index + 1).padStart(2, '0'),
    label: labels[index] ?? `Variant ${String(index + 1).padStart(2, '0')}`,
    note,
    Component,
  }))
}

const autocompleteReferences = createReferences(
  [Autocomplete01, Autocomplete02, Autocomplete03, Autocomplete04, Autocomplete05, Autocomplete06, Autocomplete07, Autocomplete08, Autocomplete09, Autocomplete10],
  [
    'Basic search',
    'Search with results',
    'Labeled search',
    'Input sizes',
    'Clearable search',
    'Clearable with label',
    'Search with trigger',
    'User directory',
    'Members and teams',
    'Icon-aware results',
  ],
  'Search selection',
)

const buttonGroupReferences = createReferences(
  [ButtonGroup01, ButtonGroup02, ButtonGroup03, ButtonGroup04, ButtonGroup05, ButtonGroup06, ButtonGroup07, ButtonGroup08, ButtonGroup09, ButtonGroup10, ButtonGroup11, ButtonGroup12, ButtonGroup13, ButtonGroup14, ButtonGroup15, ButtonGroup16],
  [
    'Download count',
    'Like action',
    'Tooltip actions',
    'Rounded actions',
    'Social links',
    'Zoom controls',
    'Numeric control',
    'Preview links',
    'Action group',
    'Primary group',
    'Segmented options',
    'Ghost actions',
    'Ripple actions',
    'Reveal actions',
    'Scale feedback',
    'Shine treatment',
  ],
  'Related actions',
)

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
  ['Search is a conversation', 'Autocomplete should expose what is searchable, keep keyboard focus predictable, show result state, and make clearing or changing a selection easy.'],
  ['Results need meaning', 'Labels, descriptions, icons, grouped users, and teams should help people choose the right record without relying on visual guesswork.'],
  ['Groups encode intent', 'Button groups should make related actions feel related while keeping primary, secondary, destructive, and overflow behavior distinct.'],
  ['Motion stays contextual', 'Ripple, reveal, scale, and shine treatments are premium references for marketing or special moments—not the default Organization action group.'],
]

const sections = [
  {
    id: 'autocomplete-family',
    title: 'Autocomplete family',
    description: 'Searchable selection patterns across basic results, labels, sizes, clear states, triggers, people, teams, and icons.',
    references: autocompleteReferences,
  },
  {
    id: 'button-group-family',
    title: 'Button Group family',
    description: 'Related actions, segmented controls, social links, zoom and numeric controls, links, stateful groups, and motion treatments.',
    references: buttonGroupReferences,
  },
]

export default function AutocompleteButtonGroupDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Search and actions should make intent obvious.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 10 premium Autocomplete and 16 premium Button Group references are installed here
            for review. This is a local library surface only; nothing has been promoted into product
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='interaction-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='interaction-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa search and action rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down result semantics, keyboard behavior, action hierarchy, responsive grouping,
              and the boundary between Organization utility and marketing motion.
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
