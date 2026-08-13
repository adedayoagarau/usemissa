import type { ComponentType, ReactNode } from 'react'
import type { Metadata } from 'next'

import BadgeDefault from '@/components/shadcn-studio/badge/badge-01'
import BadgeSecondary from '@/components/shadcn-studio/badge/badge-02'
import BadgeDestructive from '@/components/shadcn-studio/badge/badge-03'
import BadgeOutline from '@/components/shadcn-studio/badge/badge-04'
import BadgeDot from '@/components/shadcn-studio/badge/badge-05'
import BadgeRounded from '@/components/shadcn-studio/badge/badge-06'
import BadgeNumber from '@/components/shadcn-studio/badge/badge-07'
import BadgeLarge from '@/components/shadcn-studio/badge/badge-08'
import BadgeSmall from '@/components/shadcn-studio/badge/badge-09'
import BadgeWithIcon from '@/components/shadcn-studio/badge/badge-10'
import BadgeLink from '@/components/shadcn-studio/badge/badge-11'
import BadgeClosable from '@/components/shadcn-studio/badge/badge-12'
import BadgeSelectable from '@/components/shadcn-studio/badge/badge-13'
import BadgeGradient from '@/components/shadcn-studio/badge/badge-14'
import BadgeGradientOutline from '@/components/shadcn-studio/badge/badge-15'
import BadgeInProgress from '@/components/shadcn-studio/badge/badge-16'
import BadgeBlocked from '@/components/shadcn-studio/badge/badge-17'
import BadgeCompleted from '@/components/shadcn-studio/badge/badge-18'
import BadgePending from '@/components/shadcn-studio/badge/badge-19'
import BadgeFailed from '@/components/shadcn-studio/badge/badge-20'
import BadgeSuccessful from '@/components/shadcn-studio/badge/badge-21'
import BadgeAvatar from '@/components/shadcn-studio/badge/badge-22'
import BadgeCart from '@/components/shadcn-studio/badge/badge-23'
import BadgeStatusOnline from '@/components/shadcn-studio/badge/badge-24'

export const metadata: Metadata = {
  title: 'Badge family · Missa design review',
  robots: { index: false, follow: false },
}

type Reference = {
  label: string
  note: string
  Component: ComponentType
}

const foundation: Reference[] = [
  { label: '01 · Default', note: 'Primary emphasis', Component: BadgeDefault },
  { label: '02 · Secondary', note: 'Quiet emphasis', Component: BadgeSecondary },
  { label: '03 · Destructive', note: 'Danger or failure', Component: BadgeDestructive },
  { label: '04 · Outline', note: 'Neutral metadata', Component: BadgeOutline },
  { label: '05 · Dot', note: 'Compact state', Component: BadgeDot },
  { label: '06 · Rounded', note: 'Less pill-like', Component: BadgeRounded },
  { label: '07 · Number', note: 'Count or unread', Component: BadgeNumber },
  { label: '08 · Large', note: 'Feature label', Component: BadgeLarge },
  { label: '09 · Small', note: 'Dense organization flow', Component: BadgeSmall },
  { label: '10 · Icon', note: 'Icon plus label', Component: BadgeWithIcon },
]

const interaction: Reference[] = [
  { label: '11 · Link', note: 'Navigational badge', Component: BadgeLink },
  { label: '12 · Closable', note: 'Dismissible filter', Component: BadgeClosable },
  { label: '13 · Selectable', note: 'Filter or taxonomy choice', Component: BadgeSelectable },
  { label: '14 · Gradient', note: 'Marketing only', Component: BadgeGradient },
  { label: '15 · Gradient outline', note: 'Marketing only', Component: BadgeGradientOutline },
  { label: '22 · Avatar', note: 'Identity label', Component: BadgeAvatar },
  { label: '23 · Cart count', note: 'Attached count', Component: BadgeCart },
  { label: '24 · Online status', note: 'Presence indicator', Component: BadgeStatusOnline },
]

const status: Reference[] = [
  { label: '16 · In progress', note: 'Active workflow state', Component: BadgeInProgress },
  { label: '17 · Blocked', note: 'Needs intervention', Component: BadgeBlocked },
  { label: '18 · Completed', note: 'Finished state', Component: BadgeCompleted },
  { label: '19 · Pending', note: 'Awaiting review', Component: BadgePending },
  { label: '20 · Failed', note: 'Failed operation', Component: BadgeFailed },
  { label: '21 · Successful', note: 'Confirmed operation', Component: BadgeSuccessful },
]

function ReferenceGrid({ items }: { items: Reference[] }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, note, Component }) => (
        <article key={label} className="flex min-h-32 flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(28,24,21,0.05)]">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
          </div>
          <div className="mt-6"><Component /></div>
        </article>
      ))}
    </div>
  )
}

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  )
}

export default function BadgeDesignReviewPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Missa design review · Badge family</p>
        <div className="mt-4 max-w-3xl">
          <h1 className="font-heading text-4xl font-medium tracking-tight sm:text-5xl">Badges should explain state, not decorate it.</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">The complete premium Badge family is installed locally for comparison. This page is a component-library review only; none of these references are connected to product surfaces.</p>
        </div>

        <section className="mt-12" aria-labelledby="foundation-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="foundation-heading" className="text-lg font-semibold tracking-tight">Foundation and density</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">The likely Missa workhorses are outline, dot, number, icon, small, and secondary. Default and destructive remain restrained.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">01–10 / 24</span>
          </div>
          <ReferenceGrid items={foundation} />
        </section>

        <section className="mt-12" aria-labelledby="status-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="status-heading" className="text-lg font-semibold tracking-tight">Operational status</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">These are candidates for organization and review workflows, but their wording and semantic colors still need to match Missa&apos;s status vocabulary.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">16–21 / 24</span>
          </div>
          <ReferenceGrid items={status} />
        </section>

        <section className="mt-12" aria-labelledby="interaction-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="interaction-heading" className="text-lg font-semibold tracking-tight">Interaction and identity</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Closable and selectable badges need touch and keyboard review. Gradient variants remain marketing-only; avatar badges are context-specific.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">11–15 · 22–24 / 24</span>
          </div>
          <ReferenceGrid items={interaction} />
        </section>

        <section className="mt-12 rounded-xl border border-border bg-card p-6" aria-labelledby="contract-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="contract-heading" className="text-lg font-semibold tracking-tight">Missa Badge contract</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Before promoting anything, we will define the product rules independently of the premium examples.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">review gate</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Rule title="Status first">Use text plus semantic color. Never rely on color alone.</Rule>
            <Rule title="Taxonomy second">Field terms stay neutral and should not look like workflow states.</Rule>
            <Rule title="Organization density">Small badges are for compact tables, queues, and summaries—not tiny body copy.</Rule>
            <Rule title="Marketing boundary">Gradient and expressive treatments stay outside routine creator and organization work.</Rule>
          </div>
        </section>
      </div>
    </main>
  )
}
