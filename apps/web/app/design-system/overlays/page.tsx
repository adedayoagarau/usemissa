import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Dialog01 from '@/components/shadcn-studio/dialog/dialog-01'
import Dialog02 from '@/components/shadcn-studio/dialog/dialog-02'
import Dialog03 from '@/components/shadcn-studio/dialog/dialog-03'
import Dialog04 from '@/components/shadcn-studio/dialog/dialog-04'
import Dialog05 from '@/components/shadcn-studio/dialog/dialog-05'
import Dialog06 from '@/components/shadcn-studio/dialog/dialog-06'
import Dialog07 from '@/components/shadcn-studio/dialog/dialog-07'
import Dialog08 from '@/components/shadcn-studio/dialog/dialog-08'
import Dialog09 from '@/components/shadcn-studio/dialog/dialog-09'
import Dialog10 from '@/components/shadcn-studio/dialog/dialog-10'
import Dialog11 from '@/components/shadcn-studio/dialog/dialog-11'
import Dialog12 from '@/components/shadcn-studio/dialog/dialog-12'
import Dialog13 from '@/components/shadcn-studio/dialog/dialog-13'
import Dialog14 from '@/components/shadcn-studio/dialog/dialog-14'
import Dialog15 from '@/components/shadcn-studio/dialog/dialog-15'
import Dialog16 from '@/components/shadcn-studio/dialog/dialog-16'
import Dialog17 from '@/components/shadcn-studio/dialog/dialog-17'
import Dialog18 from '@/components/shadcn-studio/dialog/dialog-18'
import Dialog19 from '@/components/shadcn-studio/dialog/dialog-19'
import Dialog20 from '@/components/shadcn-studio/dialog/dialog-20'
import Sheet01 from '@/components/shadcn-studio/sheet/sheet-01'
import Sheet02 from '@/components/shadcn-studio/sheet/sheet-02'
import Sheet03 from '@/components/shadcn-studio/sheet/sheet-03'
import Sheet04 from '@/components/shadcn-studio/sheet/sheet-04'
import Sheet05 from '@/components/shadcn-studio/sheet/sheet-05'

export const metadata: Metadata = {
  title: 'Overlay family · Missa design review',
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

const dialogReferences: Reference[] = [
  { id: '01', label: 'Alert dialog', note: 'Confirmation', Component: Dialog01 },
  { id: '02', label: 'Alert with icon', note: 'Contextual confirmation', Component: Dialog02 },
  { id: '03', label: 'Destructive alert', note: 'High-risk action', Component: Dialog03 },
  { id: '04', label: 'Scrollable dialog', note: 'Long content', Component: Dialog04 },
  { id: '05', label: 'Sticky header', note: 'Persistent context', Component: Dialog05 },
  { id: '06', label: 'Sticky footer', note: 'Persistent actions', Component: Dialog06 },
  { id: '07', label: 'Fullscreen dialog', note: 'Immersive workflow', Component: Dialog07 },
  { id: '08', label: 'Terms and conditions', note: 'Reading state', Component: Dialog08 },
  { id: '09', label: 'Subscribe', note: 'Marketing conversion', Component: Dialog09 },
  { id: '10', label: 'Refer and earn', note: 'Reward flow', Component: Dialog10 },
  { id: '11', label: 'Rating', note: 'Feedback capture', Component: Dialog11 },
  { id: '12', label: 'OTP verification', note: 'Verification flow', Component: Dialog12 },
  { id: '13', label: 'Sign up', note: 'Account creation', Component: Dialog13 },
  { id: '14', label: 'Sign in', note: 'Account access', Component: Dialog14 },
  { id: '15', label: 'Invite friends', note: 'People workflow', Component: Dialog15 },
  { id: '16', label: 'Top-left alignment', note: 'Positioning', Component: Dialog16 },
  { id: '17', label: 'Top alignment', note: 'Positioning', Component: Dialog17 },
  { id: '18', label: 'Top-right alignment', note: 'Positioning', Component: Dialog18 },
  { id: '19', label: 'Middle-left alignment', note: 'Positioning', Component: Dialog19 },
  { id: '20', label: 'Middle-right alignment', note: 'Positioning', Component: Dialog20 },
]

const sheetReferences: Reference[] = [
  { id: '01', label: 'Default sheet', note: 'Right panel', Component: Sheet01 },
  { id: '02', label: 'All sheet sides', note: 'Responsive directions', Component: Sheet02 },
  { id: '03', label: 'No overlay', note: 'Context-preserving panel', Component: Sheet03 },
  { id: '04', label: 'Scrollable content', note: 'Long content', Component: Sheet04 },
  { id: '05', label: 'Form sheet', note: 'Focused workflow', Component: Sheet05 },
]

function ReferenceGrid({ references }: { references: Reference[] }) {
  return (
    <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
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
  ['One clear decision', 'A dialog should ask for one focused decision or complete one focused task.'],
  ['Destructive means explicit', 'High-risk actions need plain language, clear consequences, and a deliberate confirmation.'],
  ['Sheet for continuity', 'Use a sheet when people need to keep the underlying page in view or context.'],
  ['Escape is reliable', 'Every overlay needs an obvious close path and predictable keyboard dismissal.'],
]

export default function OverlaysDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1600px] px-6 py-12 lg:px-10'>
        <header className='max-w-3xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Overlays should focus the work, not hide it.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 20 premium Dialog references and 5 premium Sheet references are installed here for
            review. This is a local library surface only; nothing has been promoted into product
            routes.
          </p>
        </header>

        <section className='mt-12' aria-labelledby='dialog-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='dialog-family' className='text-2xl font-semibold tracking-tight'>
                Dialog family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Confirmations, long-form tasks, account flows, and positioned overlays.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {dialogReferences.length} references
            </p>
          </div>
          <ReferenceGrid references={dialogReferences} />
        </section>

        <section className='mt-16' aria-labelledby='sheet-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='sheet-family' className='text-2xl font-semibold tracking-tight'>
                Sheet family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Side panels and drawers for work that benefits from preserved page context.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {sheetReferences.length} references
            </p>
          </div>
          <ReferenceGrid references={sheetReferences} />
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='overlay-rules'>
          <div className='max-w-2xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='overlay-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa overlay rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These are building blocks, not defaults. We will choose a small number of approved
              patterns for organization flows and reserve marketing and account-flow treatments for the
              surfaces that need them.
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

