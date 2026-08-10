import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Checkbox01 from '@/components/shadcn-studio/checkbox/checkbox-01'
import Checkbox02 from '@/components/shadcn-studio/checkbox/checkbox-02'
import Checkbox03 from '@/components/shadcn-studio/checkbox/checkbox-03'
import Checkbox04 from '@/components/shadcn-studio/checkbox/checkbox-04'
import Checkbox05 from '@/components/shadcn-studio/checkbox/checkbox-05'
import Checkbox06 from '@/components/shadcn-studio/checkbox/checkbox-06'
import Checkbox07 from '@/components/shadcn-studio/checkbox/checkbox-07'
import Checkbox08 from '@/components/shadcn-studio/checkbox/checkbox-08'
import Checkbox09 from '@/components/shadcn-studio/checkbox/checkbox-09'
import Checkbox10 from '@/components/shadcn-studio/checkbox/checkbox-10'
import Checkbox11 from '@/components/shadcn-studio/checkbox/checkbox-11'
import Checkbox12 from '@/components/shadcn-studio/checkbox/checkbox-12'
import Checkbox13 from '@/components/shadcn-studio/checkbox/checkbox-13'
import Checkbox14 from '@/components/shadcn-studio/checkbox/checkbox-14'
import Checkbox15 from '@/components/shadcn-studio/checkbox/checkbox-15'
import RadioGroup01 from '@/components/shadcn-studio/radio-group/radio-group-01'
import RadioGroup02 from '@/components/shadcn-studio/radio-group/radio-group-02'
import RadioGroup03 from '@/components/shadcn-studio/radio-group/radio-group-03'
import RadioGroup04 from '@/components/shadcn-studio/radio-group/radio-group-04'
import RadioGroup05 from '@/components/shadcn-studio/radio-group/radio-group-05'
import RadioGroup06 from '@/components/shadcn-studio/radio-group/radio-group-06'
import RadioGroup07 from '@/components/shadcn-studio/radio-group/radio-group-07'
import RadioGroup08 from '@/components/shadcn-studio/radio-group/radio-group-08'
import RadioGroup09 from '@/components/shadcn-studio/radio-group/radio-group-09'
import RadioGroup10 from '@/components/shadcn-studio/radio-group/radio-group-10'
import Switch01 from '@/components/shadcn-studio/switch/switch-01'
import Switch02 from '@/components/shadcn-studio/switch/switch-02'
import Switch03 from '@/components/shadcn-studio/switch/switch-03'
import Switch04 from '@/components/shadcn-studio/switch/switch-04'
import Switch05 from '@/components/shadcn-studio/switch/switch-05'
import Switch06 from '@/components/shadcn-studio/switch/switch-06'
import Switch07 from '@/components/shadcn-studio/switch/switch-07'
import Switch08 from '@/components/shadcn-studio/switch/switch-08'
import Switch09 from '@/components/shadcn-studio/switch/switch-09'
import Switch10 from '@/components/shadcn-studio/switch/switch-10'
import Switch11 from '@/components/shadcn-studio/switch/switch-11'
import Switch12 from '@/components/shadcn-studio/switch/switch-12'
import Switch13 from '@/components/shadcn-studio/switch/switch-13'
import Switch14 from '@/components/shadcn-studio/switch/switch-14'
import Switch15 from '@/components/shadcn-studio/switch/switch-15'
import Switch16 from '@/components/shadcn-studio/switch/switch-16'
import Switch17 from '@/components/shadcn-studio/switch/switch-17'
import Switch18 from '@/components/shadcn-studio/switch/switch-18'
import Switch19 from '@/components/shadcn-studio/switch/switch-19'
import Switch20 from '@/components/shadcn-studio/switch/switch-20'

export const metadata: Metadata = {
  title: 'Selection Controls family · Missa design review',
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

const checkboxReferences: Reference[] = [
  { id: '01', label: 'Default checkbox', note: 'Baseline selection', Component: Checkbox01 },
  { id: '02', label: 'Indeterminate checkbox', note: 'Partial selection', Component: Checkbox02 },
  { id: '03', label: 'Dashed checkbox', note: 'Alternate treatment', Component: Checkbox03 },
  { id: '04', label: 'Todo list', note: 'Completion state', Component: Checkbox04 },
  { id: '05', label: 'Checkbox sizes', note: 'Density', Component: Checkbox05 },
  { id: '06', label: 'Checkbox list', note: 'Multiple selection', Component: Checkbox06 },
  { id: '07', label: 'With description', note: 'Supporting context', Component: Checkbox07 },
  { id: '08', label: 'Technology list', note: 'Grouped selection', Component: Checkbox08 },
  { id: '09', label: 'Fruit list', note: 'Grouped selection', Component: Checkbox09 },
  { id: '10', label: 'Checkbox colors', note: 'Semantic color', Component: Checkbox10 },
  { id: '11', label: 'Custom icons', note: 'Icon treatment', Component: Checkbox11 },
  { id: '12', label: 'Filled icon', note: 'Selected state', Component: Checkbox12 },
  { id: '13', label: 'Checkbox card', note: 'Selectable surface', Component: Checkbox13 },
  { id: '14', label: 'Skills list', note: 'Grouped selection', Component: Checkbox14 },
  { id: '15', label: 'Checkbox items', note: 'Structured selection', Component: Checkbox15 },
]

const radioReferences: Reference[] = [
  { id: '01', label: 'Default radio group', note: 'Single choice', Component: RadioGroup01 },
  { id: '02', label: 'Horizontal group', note: 'Inline choice', Component: RadioGroup02 },
  { id: '03', label: 'Radio colors', note: 'Semantic color', Component: RadioGroup03 },
  { id: '04', label: 'Radio sizes', note: 'Density', Component: RadioGroup04 },
  { id: '05', label: 'Dashed group', note: 'Alternate treatment', Component: RadioGroup05 },
  { id: '06', label: 'Solid group', note: 'Selected surface', Component: RadioGroup06 },
  { id: '07', label: 'With description', note: 'Supporting context', Component: RadioGroup07 },
  { id: '08', label: 'Chip group', note: 'Compact choice', Component: RadioGroup08 },
  { id: '09', label: 'List group', note: 'Structured choice', Component: RadioGroup09 },
  { id: '10', label: 'Split list group', note: 'Choice with detail', Component: RadioGroup10 },
]

const switchReferences: Reference[] = [
  { id: '01', label: 'Default switch', note: 'Persistent setting', Component: Switch01 },
  { id: '02', label: 'Square switch', note: 'Alternate geometry', Component: Switch02 },
  { id: '03', label: 'Mini switch', note: 'Compact setting', Component: Switch03 },
  { id: '04', label: 'Switch colors', note: 'Semantic color', Component: Switch04 },
  { id: '05', label: 'Switch sizes', note: 'Density', Component: Switch05 },
  { id: '06', label: 'Outline switch', note: 'Alternate treatment', Component: Switch06 },
  { id: '07', label: 'Gradient switch', note: 'Special treatment', Component: Switch07 },
  { id: '08', label: 'Toggle label', note: 'Setting with label', Component: Switch08 },
  { id: '09', label: 'Dual toggle label', note: 'On/off labels', Component: Switch09 },
  { id: '10', label: 'Icon label', note: 'Setting with icon', Component: Switch10 },
  { id: '11', label: 'Dual icon label', note: 'On/off icons', Component: Switch11 },
  { id: '12', label: 'Icon indicator', note: 'State indicator', Component: Switch12 },
  { id: '13', label: 'Permanent indicator', note: 'Persistent state', Component: Switch13 },
  { id: '14', label: 'Square indicator', note: 'Alternate geometry', Component: Switch14 },
  { id: '15', label: 'Switch card', note: 'Selectable surface', Component: Switch15 },
  { id: '16', label: 'Switch card with detail', note: 'Supporting context', Component: Switch16 },
  { id: '17', label: 'Switch card group', note: 'Grouped settings', Component: Switch17 },
  { id: '18', label: 'Skills settings', note: 'Grouped settings', Component: Switch18 },
  { id: '19', label: 'Animated switch', note: 'Special moment', Component: Switch19 },
  { id: '20', label: 'Animated gradient', note: 'Marketing treatment', Component: Switch20 },
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
  ['Checkbox means many', 'Use Checkbox when people may choose independent items or several values from the same set.'],
  ['Radio means one', 'Use Radio Group when exactly one option must be chosen and the alternatives should remain visible.'],
  ['Switch means immediate', 'Use Switch for a boolean setting whose effect is understandable and persists after the choice.'],
  ['State must be explicit', 'Labels, descriptions, disabled states, errors, and pending behavior must remain visible and announced.'],
]

const sections = [
  {
    id: 'checkbox-family',
    title: 'Checkbox family',
    description: 'Independent selection, lists, partial selection, and selectable surfaces.',
    references: checkboxReferences,
  },
  {
    id: 'radio-family',
    title: 'Radio Group family',
    description: 'One-choice decisions with visible alternatives and supporting context.',
    references: radioReferences,
  },
  {
    id: 'switch-family',
    title: 'Switch family',
    description: 'Immediate settings, indicators, cards, and carefully contained special treatments.',
    references: switchReferences,
  },
]

export default function SelectionControlsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Selection should make the consequence clear.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 15 premium Checkbox, 10 premium Radio Group, and 20 premium Switch references are
            installed here for review. This is a local library surface only; nothing has been
            promoted into product routes.
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='selection-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='selection-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa selection-control rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us range. Before product adoption, we will lock down
              semantics, keyboard behavior, validation, persistence, and state announcements as one
              coherent contract. Animated switches remain special or marketing treatments, never
              the default organization setting control.
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
