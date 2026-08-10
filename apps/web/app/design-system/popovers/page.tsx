import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Popover01 from '@/components/shadcn-studio/popover/popover-01'
import Popover02 from '@/components/shadcn-studio/popover/popover-02'
import Popover03 from '@/components/shadcn-studio/popover/popover-03'
import Popover04 from '@/components/shadcn-studio/popover/popover-04'
import Popover05 from '@/components/shadcn-studio/popover/popover-05'
import Popover06 from '@/components/shadcn-studio/popover/popover-06'
import Popover07 from '@/components/shadcn-studio/popover/popover-07'
import Popover08 from '@/components/shadcn-studio/popover/popover-08'
import Popover09 from '@/components/shadcn-studio/popover/popover-09'
import Popover10 from '@/components/shadcn-studio/popover/popover-10'

export const metadata: Metadata = {
  title: 'Popover family · Missa design review',
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
  { id: '01', label: 'Review summary', note: 'Read-only insight', Component: Popover01 },
  { id: '02', label: 'Dimensions editor', note: 'Inline editing', Component: Popover02 },
  { id: '03', label: 'Pricing details', note: 'Contextual value', Component: Popover03 },
  { id: '04', label: 'Volume control', note: 'Compact adjustment', Component: Popover04 },
  { id: '05', label: 'About panel', note: 'Contextual detail', Component: Popover05 },
  { id: '06', label: 'Download progress', note: 'Async state', Component: Popover06 },
  { id: '07', label: 'Delete file', note: 'Destructive action', Component: Popover07 },
  { id: '08', label: 'Feedback composer', note: 'Short input', Component: Popover08 },
  { id: '09', label: 'Filter panel', note: 'Filter controls', Component: Popover09 },
  { id: '10', label: 'User picker', note: 'People selection', Component: Popover10 },
]

function ReferenceGrid() {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-64 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-40 flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-6'>
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
  ['Keep context visible', 'Use Popover when people benefit from seeing the surface behind the panel.'],
  ['Match the trigger', 'The trigger and anchored panel should feel like one control, not two unrelated surfaces.'],
  ['Prefer short tasks', 'Use Dialog or Sheet when the task needs extended reading, navigation, or many actions.'],
  ['Dismiss predictably', 'Outside click, Escape, focus return, and the close path should all behave consistently.'],
]

export default function PopoversDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1500px] px-6 py-12 lg:px-10'>
        <header className='max-w-3xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Popovers should clarify without taking over.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 10 premium Shadcn Studio Popover references are installed here for review. This is
            a local library surface only; nothing has been promoted into product routes.
          </p>
        </header>

        <section className='mt-12' aria-labelledby='popover-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='popover-family' className='text-2xl font-semibold tracking-tight'>
                Popover family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Contextual details, lightweight editors, filters, feedback, and short actions.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {references.length} references
            </p>
          </div>
          <ReferenceGrid />
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='popover-rules'>
          <div className='max-w-2xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='popover-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa popover rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              Popovers are for focused context-preserving moments. The default should stay quiet,
              bounded, and easy to dismiss.
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

