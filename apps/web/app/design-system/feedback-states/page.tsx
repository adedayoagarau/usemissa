import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Alert01 from '@/components/shadcn-studio/alert/alert-01'
import Alert02 from '@/components/shadcn-studio/alert/alert-02'
import Alert03 from '@/components/shadcn-studio/alert/alert-03'
import Alert04 from '@/components/shadcn-studio/alert/alert-04'
import Alert05 from '@/components/shadcn-studio/alert/alert-05'
import Alert06 from '@/components/shadcn-studio/alert/alert-06'
import Alert07 from '@/components/shadcn-studio/alert/alert-07'
import Alert08 from '@/components/shadcn-studio/alert/alert-08'
import Alert09 from '@/components/shadcn-studio/alert/alert-09'
import Alert10 from '@/components/shadcn-studio/alert/alert-10'
import Alert11 from '@/components/shadcn-studio/alert/alert-11'
import Alert12 from '@/components/shadcn-studio/alert/alert-12'
import Alert13 from '@/components/shadcn-studio/alert/alert-13'
import Alert14 from '@/components/shadcn-studio/alert/alert-14'
import Alert15 from '@/components/shadcn-studio/alert/alert-15'
import Alert16 from '@/components/shadcn-studio/alert/alert-16'
import Alert17 from '@/components/shadcn-studio/alert/alert-17'
import Alert18 from '@/components/shadcn-studio/alert/alert-18'
import Alert19 from '@/components/shadcn-studio/alert/alert-19'
import Alert20 from '@/components/shadcn-studio/alert/alert-20'
import Alert21 from '@/components/shadcn-studio/alert/alert-21'
import Alert22 from '@/components/shadcn-studio/alert/alert-22'
import Alert23 from '@/components/shadcn-studio/alert/alert-23'
import Alert24 from '@/components/shadcn-studio/alert/alert-24'
import Alert25 from '@/components/shadcn-studio/alert/alert-25'
import Sonner01 from '@/components/shadcn-studio/sonner/sonner-01'
import Sonner02 from '@/components/shadcn-studio/sonner/sonner-02'
import Sonner03 from '@/components/shadcn-studio/sonner/sonner-03'
import Sonner04 from '@/components/shadcn-studio/sonner/sonner-04'
import Sonner05 from '@/components/shadcn-studio/sonner/sonner-05'
import Sonner06 from '@/components/shadcn-studio/sonner/sonner-06'
import Sonner07 from '@/components/shadcn-studio/sonner/sonner-07'
import Sonner08 from '@/components/shadcn-studio/sonner/sonner-08'
import Sonner09 from '@/components/shadcn-studio/sonner/sonner-09'
import Sonner10 from '@/components/shadcn-studio/sonner/sonner-10'
import Sonner11 from '@/components/shadcn-studio/sonner/sonner-11'
import Sonner12 from '@/components/shadcn-studio/sonner/sonner-12'
import Sonner13 from '@/components/shadcn-studio/sonner/sonner-13'
import Sonner14 from '@/components/shadcn-studio/sonner/sonner-14'
import Sonner15 from '@/components/shadcn-studio/sonner/sonner-15'
import Sonner16 from '@/components/shadcn-studio/sonner/sonner-16'
import Sonner17 from '@/components/shadcn-studio/sonner/sonner-17'
import Sonner18 from '@/components/shadcn-studio/sonner/sonner-18'
import Sonner19 from '@/components/shadcn-studio/sonner/sonner-19'
import Sonner20 from '@/components/shadcn-studio/sonner/sonner-20'
import Progress01 from '@/components/shadcn-studio/progress/progress-01'
import Progress02 from '@/components/shadcn-studio/progress/progress-02'
import Progress03 from '@/components/shadcn-studio/progress/progress-03'
import Progress04 from '@/components/shadcn-studio/progress/progress-04'
import Progress05 from '@/components/shadcn-studio/progress/progress-05'
import Progress06 from '@/components/shadcn-studio/progress/progress-06'
import Progress07 from '@/components/shadcn-studio/progress/progress-07'
import Progress08 from '@/components/shadcn-studio/progress/progress-08'
import Progress09 from '@/components/shadcn-studio/progress/progress-09'
import Progress10 from '@/components/shadcn-studio/progress/progress-10'
import Progress11 from '@/components/shadcn-studio/progress/progress-11'
import Progress12 from '@/components/shadcn-studio/progress/progress-12'
import Progress13 from '@/components/shadcn-studio/progress/progress-13'
import Progress14 from '@/components/shadcn-studio/progress/progress-14'
import Progress15 from '@/components/shadcn-studio/progress/progress-15'
import Progress16 from '@/components/shadcn-studio/progress/progress-16'
import Progress17 from '@/components/shadcn-studio/progress/progress-17'
import Progress18 from '@/components/shadcn-studio/progress/progress-18'
import Progress19 from '@/components/shadcn-studio/progress/progress-19'
import Progress20 from '@/components/shadcn-studio/progress/progress-20'
import Progress21 from '@/components/shadcn-studio/progress/progress-21'
import Progress22 from '@/components/shadcn-studio/progress/progress-22'
import Progress23 from '@/components/shadcn-studio/progress/progress-23'
import Skeleton01 from '@/components/shadcn-studio/skeleton/skeleton-01'
import Skeleton02 from '@/components/shadcn-studio/skeleton/skeleton-02'
import Skeleton03 from '@/components/shadcn-studio/skeleton/skeleton-03'
import Skeleton04 from '@/components/shadcn-studio/skeleton/skeleton-04'
import Skeleton05 from '@/components/shadcn-studio/skeleton/skeleton-05'
import Skeleton06 from '@/components/shadcn-studio/skeleton/skeleton-06'
import Skeleton07 from '@/components/shadcn-studio/skeleton/skeleton-07'
import Skeleton08 from '@/components/shadcn-studio/skeleton/skeleton-08'
import Skeleton09 from '@/components/shadcn-studio/skeleton/skeleton-09'
import Skeleton10 from '@/components/shadcn-studio/skeleton/skeleton-10'
import Skeleton11 from '@/components/shadcn-studio/skeleton/skeleton-11'
import Skeleton12 from '@/components/shadcn-studio/skeleton/skeleton-12'

export const metadata: Metadata = {
  title: 'Feedback States family · Missa design review',
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

const alertComponents: ComponentType[] = [Alert01, Alert02, Alert03, Alert04, Alert05, Alert06, Alert07, Alert08, Alert09, Alert10, Alert11, Alert12, Alert13, Alert14, Alert15, Alert16, Alert17, Alert18, Alert19, Alert20, Alert21, Alert22, Alert23, Alert24, Alert25]
const sonnerComponents: ComponentType[] = [Sonner01, Sonner02, Sonner03, Sonner04, Sonner05, Sonner06, Sonner07, Sonner08, Sonner09, Sonner10, Sonner11, Sonner12, Sonner13, Sonner14, Sonner15, Sonner16, Sonner17, Sonner18, Sonner19, Sonner20]
const progressComponents: ComponentType[] = [Progress01, Progress02, Progress03, Progress04, Progress05, Progress06, Progress07, Progress08, Progress09, Progress10, Progress11, Progress12, Progress13, Progress14, Progress15, Progress16, Progress17, Progress18, Progress19, Progress20, Progress21, Progress22, Progress23]
const skeletonComponents: ComponentType[] = [Skeleton01, Skeleton02, Skeleton03, Skeleton04, Skeleton05, Skeleton06, Skeleton07, Skeleton08, Skeleton09, Skeleton10, Skeleton11, Skeleton12]

const alertLabels = ["Default","With avatar","Closable","With link","Attached icon","Focused icon","File upload","Multiple actions","Task","Gradient","Success indicator","Destructive indicator","With action","Destructive","Pure destructive","Without icon","Description","Outline info","Outline success","Outline warning","Soft","Soft info","Soft success","Soft warning","Soft destructive"]
const sonnerLabels = ["Default toast","With description","With icon","With avatar","Closable","With action","Promise toast","Position variants","Soft info","Soft success","Soft warning","Soft destructive","Outline info","Outline success","Outline warning","Outline destructive","Solid info","Solid success","Solid warning","Solid destructive"]
const progressLabels = ["Default progress","With label","Loading state","Shape variants","Height variants","Gradient progress","Storage progress","Color variants","Vertical progress","Vertical labels inside","Vertical labels outside","Vertical sizes","Labels inside","Checklist progress","Circular progress","Circular storage","Circular shape","Circular stroke","Circular color","Download progress","Striped progress","Animated circular","Productivity progress"]
const skeletonLabels = ["Default skeleton","Text skeleton","Card skeleton","Form skeleton","Profile page skeleton","Chat skeleton","List skeleton","Shimmer skeleton","Media skeleton","User list skeleton","Table skeleton","Widget cards skeleton"]

const alertReferences = createReferences(alertComponents, alertLabels, 'Inline feedback')
const sonnerReferences = createReferences(sonnerComponents, sonnerLabels, 'Toast feedback')
const progressReferences = createReferences(progressComponents, progressLabels, 'Task progress')
const skeletonReferences = createReferences(skeletonComponents, skeletonLabels, 'Loading placeholder')

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
  ['Tell the truth about state', 'Feedback should reflect a real status, result, warning, or next action; never use color or motion as the only signal.'],
  ['Match urgency to channel', 'Inline Alert belongs near the affected content, Sonner is for transient feedback, and persistent problems need a durable surface.'],
  ['Progress needs a contract', 'Determinate progress must have a trustworthy measurement; indeterminate progress should not imply a completion estimate.'],
  ['Loading preserves structure', 'Skeletons should match the eventual layout, avoid layout shift, and disappear when meaningful content is ready.'],
]

const sections = [
  {
    id: 'alert-family',
    title: 'Alert family',
    description: 'Inline warnings, success states, actions, uploads, destructive messages, and quiet treatments.',
    references: alertReferences,
  },
  {
    id: 'sonner-family',
    title: 'Sonner / toast family',
    description: 'Transient notifications with actions, promises, positions, semantic tones, and visual treatments.',
    references: sonnerReferences,
  },
  {
    id: 'progress-family',
    title: 'Progress family',
    description: 'Determinate and indeterminate task progress in horizontal, vertical, circular, and download contexts.',
    references: progressReferences,
  },
  {
    id: 'skeleton-family',
    title: 'Skeleton family',
    description: 'Loading placeholders for text, cards, forms, profiles, chat, tables, lists, and widgets.',
    references: skeletonReferences,
  },
]

export default function FeedbackStatesDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Feedback should make the next truth obvious.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 25 premium Alert, 20 premium Sonner, 23 premium Progress, and 12 premium Skeleton
            references are installed here for review. This is a local library surface only; nothing
            has been promoted into product routes.
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='feedback-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='feedback-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa feedback rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us visual range. Before product adoption, we will lock
              down severity, persistence, live-region behavior, progress semantics, reduced-motion
              behavior, and the boundary between transient and durable feedback.
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

