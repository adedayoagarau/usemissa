import type { ComponentType } from 'react'
import type { Metadata } from 'next'
import { TooltipProvider } from '@/components/ui/tooltip'

import Tooltip01 from '@/components/shadcn-studio/tooltip/tooltip-01'
import Tooltip02 from '@/components/shadcn-studio/tooltip/tooltip-02'
import Tooltip03 from '@/components/shadcn-studio/tooltip/tooltip-03'
import Tooltip04 from '@/components/shadcn-studio/tooltip/tooltip-04'
import Tooltip05 from '@/components/shadcn-studio/tooltip/tooltip-05'
import Tooltip06 from '@/components/shadcn-studio/tooltip/tooltip-06'
import Tooltip07 from '@/components/shadcn-studio/tooltip/tooltip-07'
import Tooltip08 from '@/components/shadcn-studio/tooltip/tooltip-08'
import Tooltip09 from '@/components/shadcn-studio/tooltip/tooltip-09'
import Tooltip10 from '@/components/shadcn-studio/tooltip/tooltip-10'
import Tooltip11 from '@/components/shadcn-studio/tooltip/tooltip-11'
import Tooltip12 from '@/components/shadcn-studio/tooltip/tooltip-12'
import Tooltip13 from '@/components/shadcn-studio/tooltip/tooltip-13'
import Tooltip14 from '@/components/shadcn-studio/tooltip/tooltip-14'
import Tooltip15 from '@/components/shadcn-studio/tooltip/tooltip-15'

export const metadata: Metadata = {
  title: 'Tooltip family · Missa design review',
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
  { id: '01', label: 'Default tooltip', note: 'Baseline hint', Component: Tooltip01 },
  { id: '02', label: 'Light tooltip', note: 'Surface treatment', Component: Tooltip02 },
  { id: '03', label: 'No arrow', note: 'Quiet treatment', Component: Tooltip03 },
  { id: '04', label: 'Error tooltip', note: 'Validation context', Component: Tooltip04 },
  { id: '05', label: 'Icon tooltip', note: 'Icon affordance', Component: Tooltip05 },
  { id: '06', label: 'Rounded tooltip', note: 'Marketing-only shape', Component: Tooltip06 },
  { id: '07', label: 'Rich content', note: 'Longer explanation', Component: Tooltip07 },
  { id: '08', label: 'Four directions', note: 'Placement', Component: Tooltip08 },
  { id: '09', label: 'Avatar tooltip', note: 'People context', Component: Tooltip09 },
  { id: '10', label: 'Badge tooltip', note: 'Status context', Component: Tooltip10 },
  { id: '11', label: 'Media hover card', note: 'Rich preview', Component: Tooltip11 },
  { id: '12', label: 'Stats hover card', note: 'Data preview', Component: Tooltip12 },
  { id: '13', label: 'Project hover card', note: 'Progress context', Component: Tooltip13 },
  { id: '14', label: 'Alert hover card', note: 'Attention context', Component: Tooltip14 },
  { id: '15', label: 'Tasks hover card', note: 'Work preview', Component: Tooltip15 },
]

function ReferenceGrid() {
  return (
    <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-56 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-32 flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-5'>
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
  ['Say less', 'A tooltip should provide a concise label or hint, not become a second paragraph.'],
  ['Work on focus', 'Keyboard focus must reveal the same useful context as pointer hover.'],
  ['Use hover cards for depth', 'Rich previews belong in a hover card or Popover, not a tiny tooltip.'],
  ['Never hide critical meaning', 'Required instructions, errors, and essential actions must remain visible without hover.'],
]

export default function TooltipsDesignSystemPage() {
  return (
    <TooltipProvider delay={0}>
      <main className='min-h-screen bg-background text-foreground'>
        <div className='mx-auto max-w-[1600px] px-6 py-12 lg:px-10'>
          <header className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
              Missa component library · premium review
            </p>
            <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
              Tooltips should clarify, never conceal.
            </h1>
            <p className='mt-5 text-base leading-7 text-muted-foreground'>
              All 15 premium Shadcn Studio Tooltip references are installed here for review. This
              includes the Hover Card variants in the same contextual-help family. This is a local
              library surface only; nothing has been promoted into product routes.
            </p>
          </header>

          <section className='mt-12' aria-labelledby='tooltip-family'>
            <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <h2 id='tooltip-family' className='text-2xl font-semibold tracking-tight'>
                  Tooltip family
                </h2>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Concise hints, contextual status, richer previews, and placement treatments.
                </p>
              </div>
              <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
                {references.length} references
              </p>
            </div>
            <ReferenceGrid />
          </section>

          <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='tooltip-rules'>
            <div className='max-w-2xl'>
              <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                Local contract
              </p>
              <h2 id='tooltip-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
                Missa tooltip rules
              </h2>
              <p className='mt-3 text-sm leading-6 text-muted-foreground'>
                Tooltips and hover cards are supporting layers. The page, field, button, or status
                still has to make sense when the pointer is nowhere near it.
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
    </TooltipProvider>
  )
}

