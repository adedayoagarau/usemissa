import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Command01 from '@/components/shadcn-studio/command/command-01'
import Command02 from '@/components/shadcn-studio/command/command-02'
import Command03 from '@/components/shadcn-studio/command/command-03'
import Command04 from '@/components/shadcn-studio/command/command-04'
import Command05 from '@/components/shadcn-studio/command/command-05'
import Command06 from '@/components/shadcn-studio/command/command-06'
import Command07 from '@/components/shadcn-studio/command/command-07'
import Command08 from '@/components/shadcn-studio/command/command-08'
import Command09 from '@/components/shadcn-studio/command/command-09'
import Command10 from '@/components/shadcn-studio/command/command-10'
import Command11 from '@/components/shadcn-studio/command/command-11'
import Command12 from '@/components/shadcn-studio/command/command-12'
import Command13 from '@/components/shadcn-studio/command/command-13'
import Command14 from '@/components/shadcn-studio/command/command-14'
import Combobox01 from '@/components/shadcn-studio/combobox/combobox-01'
import Combobox02 from '@/components/shadcn-studio/combobox/combobox-02'
import Combobox03 from '@/components/shadcn-studio/combobox/combobox-03'
import Combobox04 from '@/components/shadcn-studio/combobox/combobox-04'
import Combobox05 from '@/components/shadcn-studio/combobox/combobox-05'
import Combobox06 from '@/components/shadcn-studio/combobox/combobox-06'
import Combobox07 from '@/components/shadcn-studio/combobox/combobox-07'
import Combobox08 from '@/components/shadcn-studio/combobox/combobox-08'
import Combobox09 from '@/components/shadcn-studio/combobox/combobox-09'
import Combobox10 from '@/components/shadcn-studio/combobox/combobox-10'

export const metadata: Metadata = {
  title: 'Command and Combobox family · Missa design review',
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

const commandReferences: Reference[] = [
  { id: '01', label: 'Basic command', note: 'Command surface', Component: Command01 },
  { id: '02', label: 'Pages + actions', note: 'Navigation palette', Component: Command02 },
  { id: '03', label: 'Repository ops', note: 'Developer workflow', Component: Command03 },
  { id: '04', label: 'Basic dialog', note: 'Modal palette', Component: Command04 },
  { id: '05', label: 'Keyboard shortcuts', note: 'Shortcut affordance', Component: Command05 },
  { id: '06', label: 'Scrollable command', note: 'Long result set', Component: Command06 },
  { id: '07', label: 'File actions', note: 'File workflow', Component: Command07 },
  { id: '08', label: 'Team leads', note: 'People workflow', Component: Command08 },
  { id: '09', label: 'Developer palette', note: 'organization actions', Component: Command09 },
  { id: '10', label: 'Search palette', note: 'Search workflow', Component: Command10 },
  { id: '11', label: 'Marketing blocks', note: 'Filterable catalog', Component: Command11 },
  { id: '12', label: 'Slide to top', note: 'Motion treatment', Component: Command12 },
  { id: '13', label: 'Slide to right', note: 'Motion treatment', Component: Command13 },
  { id: '14', label: 'Zoom in', note: 'Motion treatment', Component: Command14 },
]

const comboboxReferences: Reference[] = [
  { id: '01', label: 'Searchable framework', note: 'Basic search', Component: Combobox01 },
  { id: '02', label: 'Option groups', note: 'Grouped choices', Component: Combobox02 },
  { id: '03', label: 'Disabled options', note: 'Partial availability', Component: Combobox03 },
  { id: '04', label: 'Icon options', note: 'Visual recognition', Component: Combobox04 },
  { id: '05', label: 'Custom check', note: 'Selection treatment', Component: Combobox05 },
  { id: '06', label: 'Search + add', note: 'Create workflow', Component: Combobox06 },
  { id: '07', label: 'Timezone', note: 'Structured choice', Component: Combobox07 },
  { id: '08', label: 'User avatar', note: 'People choice', Component: Combobox08 },
  { id: '09', label: 'Country flag', note: 'Geographic choice', Component: Combobox09 },
  { id: '10', label: 'Multiple values', note: 'Multi-select', Component: Combobox10 },
]

function ReferenceGrid({ references, columns = 'three' }: { references: Reference[]; columns?: 'two' | 'three' }) {
  return (
    <div className={columns === 'two' ? 'grid gap-5 xl:grid-cols-2' : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'}>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-60 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-36 flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-5'>
              <div className='flex w-full justify-center'>
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
  ['Search is an action', 'Command palettes should expose meaningful actions, not become an unstructured list of everything.'],
  ['Canonical terms first', 'Comboboxes for Missa taxonomy must return stable canonical values, not presentation-only strings.'],
  ['Keyboard is the baseline', 'Arrow keys, type-ahead, Enter, Escape, and focus return need to work without a pointer.'],
  ['Show empty and loading states', 'A search surface should explain whether there are no matches, results are loading, or creation is available.'],
]

export default function CommandsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1600px] px-6 py-12 lg:px-10'>
        <header className='max-w-3xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Search should turn intent into the next useful result.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 14 premium Command references and 10 premium Combobox references are installed here
            for review. This is a local library surface only; nothing has been promoted into product
            routes.
          </p>
        </header>

        <section className='mt-12' aria-labelledby='command-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='command-family' className='text-2xl font-semibold tracking-tight'>
                Command family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Keyboard-first actions, navigation palettes, searchable catalogs, and shortcuts.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {commandReferences.length} references
            </p>
          </div>
          <ReferenceGrid references={commandReferences} />
        </section>

        <section className='mt-16' aria-labelledby='combobox-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='combobox-family' className='text-2xl font-semibold tracking-tight'>
                Combobox family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Searchable single and multiple choices for taxonomy, people, locations, and structured metadata.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {comboboxReferences.length} references
            </p>
          </div>
          <ReferenceGrid references={comboboxReferences} columns='two' />
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='command-rules'>
          <div className='max-w-2xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='command-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa search-control rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              Command and Combobox are not interchangeable decoration. We will use each according to
              whether the user is invoking an action or choosing a value.
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

