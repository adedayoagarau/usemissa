import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Breadcrumb01 from '@/components/shadcn-studio/breadcrumb/breadcrumb-01'
import Breadcrumb02 from '@/components/shadcn-studio/breadcrumb/breadcrumb-02'
import Breadcrumb03 from '@/components/shadcn-studio/breadcrumb/breadcrumb-03'
import Breadcrumb04 from '@/components/shadcn-studio/breadcrumb/breadcrumb-04'
import Breadcrumb05 from '@/components/shadcn-studio/breadcrumb/breadcrumb-05'
import Breadcrumb06 from '@/components/shadcn-studio/breadcrumb/breadcrumb-06'
import Breadcrumb07 from '@/components/shadcn-studio/breadcrumb/breadcrumb-07'
import Breadcrumb08 from '@/components/shadcn-studio/breadcrumb/breadcrumb-08'

export const metadata: Metadata = {
  title: 'Breadcrumb family · Missa design review',
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
  { id: '01', label: 'Default separators', note: 'Slash-free path', Component: Breadcrumb01 },
  { id: '02', label: 'Slash separator', note: 'Home icon + slash', Component: Breadcrumb02 },
  { id: '03', label: 'Chevron separators', note: 'Icon-rich path', Component: Breadcrumb03 },
  { id: '04', label: 'Dot separators', note: 'Quiet hierarchy', Component: Breadcrumb04 },
  { id: '05', label: 'Outline tabs', note: 'Emphasized segments', Component: Breadcrumb05 },
  { id: '06', label: 'Dropdown segment', note: 'Collapsed destination', Component: Breadcrumb06 },
  { id: '07', label: 'Interactive folder', note: 'Open/closed state', Component: Breadcrumb07 },
  { id: '08', label: 'Outlined container', note: 'Contained path', Component: Breadcrumb08 },
]

const rules = [
  ['Use for depth', 'Breadcrumbs explain where someone is inside a hierarchy; they do not replace primary navigation.'],
  ['Keep the current page', 'The final segment is the current location and should not behave like a link.'],
  ['Protect narrow screens', 'Long paths should truncate or collapse intentionally instead of pushing the page width.'],
  ['Prefer calm separators', 'Use the separator to clarify hierarchy, not to compete with the page title or primary action.'],
]

function ReferenceGrid() {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-48 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-24 w-full items-center overflow-x-auto rounded-xl bg-muted/40 p-5'>
              <div className='mx-auto w-max min-w-max'>
                <Demo />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default function BreadcrumbsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1400px] px-6 py-12 lg:px-10'>
        <header className='max-w-3xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Breadcrumbs should make depth legible.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 8 premium Shadcn Studio Breadcrumb references are installed here for review. This
            is a local library surface only; nothing has been promoted into product routes.
          </p>
        </header>

        <section className='mt-12'>
          <div className='mb-5 flex items-end justify-between gap-4'>
            <div>
              <h2 className='text-2xl font-semibold tracking-tight'>Breadcrumb family</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Separators, icons, dropdowns, and contained treatments.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {references.length} references
            </p>
          </div>
          <ReferenceGrid />
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='breadcrumb-rules'>
          <div className='max-w-2xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='breadcrumb-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa breadcrumb rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              We will choose one default Organization treatment and reserve the decorative variants
              for surfaces that genuinely need extra hierarchy.
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
