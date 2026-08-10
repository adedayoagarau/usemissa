import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import DataTable01 from '@/components/shadcn-studio/data-table/data-table-01'
import DataTable02 from '@/components/shadcn-studio/data-table/data-table-02'
import DataTable03 from '@/components/shadcn-studio/data-table/data-table-03'
import DataTable04 from '@/components/shadcn-studio/data-table/data-table-04'
import DataTable05 from '@/components/shadcn-studio/data-table/data-table-05'
import DataTable06 from '@/components/shadcn-studio/data-table/data-table-06'
import DataTable07 from '@/components/shadcn-studio/data-table/data-table-07'
import DataTable08 from '@/components/shadcn-studio/data-table/data-table-08'
import DataTable09 from '@/components/shadcn-studio/data-table/data-table-09'
import DataTable10 from '@/components/shadcn-studio/data-table/data-table-10'
import DataTable11 from '@/components/shadcn-studio/data-table/data-table-11'
import DataTable12 from '@/components/shadcn-studio/data-table/data-table-12'
import DataTable13 from '@/components/shadcn-studio/data-table/data-table-13'
import CodeBlock01 from '@/components/shadcn-studio/code-block/code-block-01'
import CodeBlock02 from '@/components/shadcn-studio/code-block/code-block-02'
import CodeBlock03 from '@/components/shadcn-studio/code-block/code-block-03'
import CodeBlock04 from '@/components/shadcn-studio/code-block/code-block-04'
import CodeBlock05 from '@/components/shadcn-studio/code-block/code-block-05'
import CodeBlock06 from '@/components/shadcn-studio/code-block/code-block-06'
import CodeBlock07 from '@/components/shadcn-studio/code-block/code-block-07'

export const metadata: Metadata = {
  title: 'Data Table and Code Block family · Missa design review',
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

const dataTableReferences = createReferences(
  [DataTable01, DataTable02, DataTable03, DataTable04, DataTable05, DataTable06, DataTable07, DataTable08, DataTable09, DataTable10, DataTable11, DataTable12, DataTable13],
  [
    'Default table',
    'Density control',
    'Column visibility',
    'Column filters',
    'Sortable column',
    'Resizable columns',
    'Pinned columns',
    'Draggable columns',
    'Expandable rows',
    'Custom pagination',
    'Pagination with page size',
    'CSV export',
    'Editable cells',
  ],
  'Operational data',
)

const codeBlockReferences = createReferences(
  [CodeBlock01, CodeBlock02, CodeBlock03, CodeBlock04, CodeBlock05, CodeBlock06, CodeBlock07],
  [
    'Basic code block',
    'Filename and line numbers',
    'Custom background',
    'Highlighted lines',
    'Tabbed code',
    'Tabbed preview',
    'Multiple tabs',
  ],
  'Code surface',
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
  ['Tables carry operational weight', 'Sorting, filtering, selection, pagination, editing, and export need clear state, keyboard access, stable columns, and an honest empty or error state.'],
  ['Density is a decision', 'Compact tables should remain scannable and readable; use responsive fallback patterns when a table cannot fit without hiding meaning.'],
  ['Data actions stay reversible', 'Pinning, reordering, editing, exporting, and deleting should preserve context and give people a safe recovery path.'],
  ['Code is evidence too', 'Code surfaces need readable contrast, copy feedback, language context, line references, and tabs that do not conceal important content.'],
]

const sections = [
  {
    id: 'data-table-family',
    title: 'Data Table family',
    description: 'Operational table patterns spanning density, visibility, filtering, sorting, resizing, pinning, drag, expansion, pagination, export, and editing.',
    references: dataTableReferences,
  },
  {
    id: 'code-block-family',
    title: 'Code Block family',
    description: 'Readable code surfaces with filenames, line numbers, custom backgrounds, highlighted lines, tabs, previews, and multiple files.',
    references: codeBlockReferences,
  },
]

export default function DataTableCodeBlockDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Operational data should stay legible and accountable.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 13 premium Data Table and 7 premium Code Block references are installed here for
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='data-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='data-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa data-surface rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down data freshness, tenant scope, keyboard interaction, responsive fallback,
              export semantics, and code-surface provenance as one coherent contract.
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

