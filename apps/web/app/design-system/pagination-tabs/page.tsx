import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Pagination01 from '@/components/shadcn-studio/pagination/pagination-01'
import Pagination02 from '@/components/shadcn-studio/pagination/pagination-02'
import Pagination03 from '@/components/shadcn-studio/pagination/pagination-03'
import Pagination04 from '@/components/shadcn-studio/pagination/pagination-04'
import Pagination05 from '@/components/shadcn-studio/pagination/pagination-05'
import Pagination06 from '@/components/shadcn-studio/pagination/pagination-06'
import Pagination07 from '@/components/shadcn-studio/pagination/pagination-07'
import Pagination08 from '@/components/shadcn-studio/pagination/pagination-08'
import Pagination09 from '@/components/shadcn-studio/pagination/pagination-09'
import Pagination10 from '@/components/shadcn-studio/pagination/pagination-10'
import Tabs01 from '@/components/shadcn-studio/tabs/tabs-01'
import Tabs02 from '@/components/shadcn-studio/tabs/tabs-02'
import Tabs03 from '@/components/shadcn-studio/tabs/tabs-03'
import Tabs04 from '@/components/shadcn-studio/tabs/tabs-04'
import Tabs05 from '@/components/shadcn-studio/tabs/tabs-05'
import Tabs06 from '@/components/shadcn-studio/tabs/tabs-06'
import Tabs07 from '@/components/shadcn-studio/tabs/tabs-07'
import Tabs08 from '@/components/shadcn-studio/tabs/tabs-08'
import Tabs09 from '@/components/shadcn-studio/tabs/tabs-09'
import Tabs10 from '@/components/shadcn-studio/tabs/tabs-10'
import Tabs11 from '@/components/shadcn-studio/tabs/tabs-11'
import Tabs12 from '@/components/shadcn-studio/tabs/tabs-12'
import Tabs13 from '@/components/shadcn-studio/tabs/tabs-13'
import Tabs14 from '@/components/shadcn-studio/tabs/tabs-14'
import Tabs15 from '@/components/shadcn-studio/tabs/tabs-15'
import Tabs16 from '@/components/shadcn-studio/tabs/tabs-16'
import Tabs17 from '@/components/shadcn-studio/tabs/tabs-17'
import Tabs18 from '@/components/shadcn-studio/tabs/tabs-18'
import Tabs19 from '@/components/shadcn-studio/tabs/tabs-19'
import Tabs20 from '@/components/shadcn-studio/tabs/tabs-20'
import Tabs21 from '@/components/shadcn-studio/tabs/tabs-21'
import Tabs22 from '@/components/shadcn-studio/tabs/tabs-22'
import Tabs23 from '@/components/shadcn-studio/tabs/tabs-23'
import Tabs24 from '@/components/shadcn-studio/tabs/tabs-24'
import Tabs25 from '@/components/shadcn-studio/tabs/tabs-25'

export const metadata: Metadata = {
  title: 'Pagination and Tabs family · Missa design review',
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

const paginationReferences: Reference[] = [
  { id: '01', label: 'Default pagination', note: 'Baseline navigation', Component: Pagination01 },
  { id: '02', label: 'Icon pagination', note: 'Compact navigation', Component: Pagination02 },
  { id: '03', label: 'Primary buttons', note: 'Emphasized action', Component: Pagination03 },
  { id: '04', label: 'Secondary buttons', note: 'Quiet action', Component: Pagination04 },
  { id: '05', label: 'Page list', note: 'Visible page range', Component: Pagination05 },
  { id: '06', label: 'Compact page list', note: 'Dense navigation', Component: Pagination06 },
  { id: '07', label: 'First and last controls', note: 'Long result set', Component: Pagination07 },
  { id: '08', label: 'Ellipsis pagination', note: 'Condensed range', Component: Pagination08 },
  { id: '09', label: 'Underline pagination', note: 'Quiet treatment', Component: Pagination09 },
  { id: '10', label: 'Card pagination', note: 'Contained navigation', Component: Pagination10 },
]

const tabsReferences: Reference[] = [
  { id: '01', label: 'Default tabs', note: 'Baseline navigation', Component: Tabs01 },
  { id: '02', label: 'Outlined tabs', note: 'Contained treatment', Component: Tabs02 },
  { id: '03', label: 'Icon tabs', note: 'Icon context', Component: Tabs03 },
  { id: '04', label: 'Badge tabs', note: 'Count context', Component: Tabs04 },
  { id: '05', label: 'Vertical icon tabs', note: 'Vertical navigation', Component: Tabs05 },
  { id: '06', label: 'Vertical badge tabs', note: 'Vertical counts', Component: Tabs06 },
  { id: '07', label: 'Tooltip tabs', note: 'Compact context', Component: Tabs07 },
  { id: '08', label: 'Soft pills', note: 'Soft emphasis', Component: Tabs08 },
  { id: '09', label: 'Solid pills', note: 'Strong emphasis', Component: Tabs09 },
  { id: '10', label: 'Outlined pills', note: 'Outlined emphasis', Component: Tabs10 },
  { id: '11', label: 'Underline tabs', note: 'Quiet emphasis', Component: Tabs11 },
  { id: '12', label: 'Sharp tabs', note: 'Crisp geometry', Component: Tabs12 },
  { id: '13', label: 'Lifted tabs', note: 'Layered treatment', Component: Tabs13 },
  { id: '14', label: 'Overflow tabs', note: 'Many destinations', Component: Tabs14 },
  { id: '15', label: 'Vertical tabs', note: 'Vertical navigation', Component: Tabs15 },
  { id: '16', label: 'Vertical underline', note: 'Quiet vertical', Component: Tabs16 },
  { id: '17', label: 'Soft vertical tabs', note: 'Soft vertical', Component: Tabs17 },
  { id: '18', label: 'Vertical solid tabs', note: 'Strong vertical', Component: Tabs18 },
  { id: '19', label: 'Vertical sharp tabs', note: 'Crisp vertical', Component: Tabs19 },
  { id: '20', label: 'Vertical lined tabs', note: 'Lined vertical', Component: Tabs20 },
  { id: '21', label: 'Vertical tooltip tabs', note: 'Compact vertical', Component: Tabs21 },
  { id: '22', label: 'Vertical icon tabs', note: 'Icon vertical', Component: Tabs22 },
  { id: '23', label: 'Vertical badge tabs', note: 'Count vertical', Component: Tabs23 },
  { id: '24', label: 'Vertical outline tabs', note: 'Outlined vertical', Component: Tabs24 },
  { id: '25', label: 'Custom tabs', note: 'Product treatment', Component: Tabs25 },
]

function ReferenceGrid({ references }: { references: Reference[] }) {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-72 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-48 flex-1 items-center justify-center overflow-auto rounded-xl bg-muted/40 p-5'>
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
  ['Keep position honest', 'Pagination must preserve query, filters, sort, and visible result context so people know what page they are on.'],
  ['Make the current state clear', 'The active page or tab needs a clear visual and semantic state, including keyboard focus and screen-reader announcements.'],
  ['Tabs are local navigation', 'Use Tabs for related views in one context; use links or primary navigation when destinations are meaningfully separate.'],
  ['Design for narrow screens', 'Long page ranges and tab lists need an intentional compact or scrollable treatment without hiding available destinations.'],
]

const sections = [
  {
    id: 'pagination-family',
    title: 'Pagination family',
    description: 'Result navigation, page ranges, ellipsis, boundaries, and contained page controls.',
    references: paginationReferences,
  },
  {
    id: 'tabs-family',
    title: 'Tabs family',
    description: 'Horizontal and vertical local navigation with icons, badges, pills, lines, and responsive variants.',
    references: tabsReferences,
  },
]

export default function PaginationTabsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Navigation should keep people oriented.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 10 premium Pagination and 25 premium Tabs references are installed here for review.
            This is a local library surface only; nothing has been promoted into product routes.
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='navigation-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='navigation-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa navigation rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us visual range. Before product adoption, we will lock
              down URL state, query persistence, keyboard behavior, announcements, responsive
              overflow, and the boundary between local views and real navigation.
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
