import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Table01 from '@/components/shadcn-studio/table/table-01'
import Table02 from '@/components/shadcn-studio/table/table-02'
import Table03 from '@/components/shadcn-studio/table/table-03'
import Table04 from '@/components/shadcn-studio/table/table-04'
import Table05 from '@/components/shadcn-studio/table/table-05'
import Table06 from '@/components/shadcn-studio/table/table-06'
import Table07 from '@/components/shadcn-studio/table/table-07'
import Table08 from '@/components/shadcn-studio/table/table-08'
import Table09 from '@/components/shadcn-studio/table/table-09'
import Table10 from '@/components/shadcn-studio/table/table-10'
import Table11 from '@/components/shadcn-studio/table/table-11'
import Table12 from '@/components/shadcn-studio/table/table-12'
import Table13 from '@/components/shadcn-studio/table/table-13'
import Table14 from '@/components/shadcn-studio/table/table-14'
import Table15 from '@/components/shadcn-studio/table/table-15'

export const metadata: Metadata = {
  title: 'Table family · Missa design review',
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

const references: Reference[] = [
  { id: '01', label: 'Default table', note: 'Baseline structure', Component: Table01 },
  { id: '02', label: 'Bordered table', note: 'Contained surface', Component: Table02 },
  { id: '03', label: 'Compact rows', note: 'Dense organization mode', Component: Table03 },
  { id: '04', label: 'Vertical lines', note: 'Column separation', Component: Table04 },
  { id: '05', label: 'No border', note: 'Quiet surface', Component: Table05 },
  { id: '06', label: 'Striped rows', note: 'Scanning aid', Component: Table06 },
  { id: '07', label: 'Striped columns', note: 'Comparison aid', Component: Table07 },
  { id: '08', label: 'Highlighted row', note: 'Attention state', Component: Table08 },
  { id: '09', label: 'Responsive table', note: 'Narrow viewport', Component: Table09 },
  { id: '10', label: 'Sticky header', note: 'Long dataset', Component: Table10 },
  { id: '11', label: 'Sticky columns', note: 'Wide dataset', Component: Table11 },
  { id: '12', label: 'Vertical table', note: 'Record detail', Component: Table12 },
  { id: '13', label: 'Avatar rows', note: 'People records', Component: Table13 },
  { id: '14', label: 'Pagination', note: 'Result navigation', Component: Table14 },
  { id: '15', label: 'Selectable rows', note: 'Bulk workflow', Component: Table15 },
]

const sections = [
  {
    title: 'Foundations',
    description: 'Surface, density, borders, striping, and attention treatments.',
    ids: ['01', '02', '03', '04', '05', '06', '07', '08'],
  },
  {
    title: 'Responsive and structured data',
    description: 'Tables that stay readable when data gets wide, long, or record-shaped.',
    ids: ['09', '10', '11', '12', '13'],
  },
  {
    title: 'Operational states',
    description: 'Navigation and selection patterns for real organization work.',
    ids: ['14', '15'],
  },
]

function ReferenceGrid({ ids }: { ids: string[] }) {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {ids.map((id) => {
        const reference = references.find((item) => item.id === id)
        if (!reference) return null

        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-80 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
            <div className='mb-6 flex items-start justify-between gap-4'>
              <div>
                <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                  {reference.id}
                </p>
                <h2 className='mt-1 text-sm font-semibold'>{reference.label}</h2>
              </div>
              <span className='shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground'>
                {reference.note}
              </span>
            </div>
            <div className='flex min-h-56 flex-1 items-center overflow-hidden rounded-xl bg-muted/40 p-4'>
              <div className='w-full overflow-x-auto'>
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
  ['Stable columns', 'Column meaning, order, and alignment should remain predictable across states and viewport sizes.'],
  ['Density is intentional', 'Organization flows can be compact, but comfortable reading, focus, and touch targets cannot be sacrificed.'],
  ['State is visible', 'Loading, empty, selected, disabled, sorted, and error states need explicit visual and semantic treatment.'],
  ['Bulk actions are safe', 'Selection, pagination, and row actions must preserve scope so people know exactly what will change.'],
]

export default function TablesDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Tables should make evidence comparable.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 15 premium Shadcn Studio Table references are installed here for review. This is a
            local library surface only; nothing has been promoted into product routes.
          </p>
        </header>

        <section className='mt-12 space-y-10'>
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={section.title.toLowerCase().replaceAll(' ', '-')}>
              <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <h2
                    id={section.title.toLowerCase().replaceAll(' ', '-')}
                    className='text-2xl font-semibold tracking-tight'
                  >
                    {section.title}
                  </h2>
                  <p className='mt-1 text-sm text-muted-foreground'>{section.description}</p>
                </div>
                <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
                  {section.ids.length} references
                </p>
              </div>
              <ReferenceGrid ids={section.ids} />
            </section>
          ))}
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='table-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='table-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa table rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These references give us visual range; our actual organization table contract will also
              define column semantics, sorting announcements, row scope, pagination behavior, and
              truthful loading and empty states.
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

