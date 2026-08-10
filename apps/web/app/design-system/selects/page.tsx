import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Select01 from '@/components/shadcn-studio/select/select-01'
import Select02 from '@/components/shadcn-studio/select/select-02'
import Select03 from '@/components/shadcn-studio/select/select-03'
import Select04 from '@/components/shadcn-studio/select/select-04'
import Select05 from '@/components/shadcn-studio/select/select-05'
import Select06 from '@/components/shadcn-studio/select/select-06'
import Select07 from '@/components/shadcn-studio/select/select-07'
import Select08 from '@/components/shadcn-studio/select/select-08'
import Select09 from '@/components/shadcn-studio/select/select-09'
import Select10 from '@/components/shadcn-studio/select/select-10'
import Select11 from '@/components/shadcn-studio/select/select-11'
import Select12 from '@/components/shadcn-studio/select/select-12'
import Select13 from '@/components/shadcn-studio/select/select-13'
import Select14 from '@/components/shadcn-studio/select/select-14'
import Select15 from '@/components/shadcn-studio/select/select-15'
import Select16 from '@/components/shadcn-studio/select/select-16'
import Select17 from '@/components/shadcn-studio/select/select-17'
import Select18 from '@/components/shadcn-studio/select/select-18'
import Select19 from '@/components/shadcn-studio/select/select-19'
import Select20 from '@/components/shadcn-studio/select/select-20'
import Select21 from '@/components/shadcn-studio/select/select-21'
import Select22 from '@/components/shadcn-studio/select/select-22'
import Select23 from '@/components/shadcn-studio/select/select-23'
import Select24 from '@/components/shadcn-studio/select/select-24'
import Select25 from '@/components/shadcn-studio/select/select-25'
import Select26 from '@/components/shadcn-studio/select/select-26'
import Select27 from '@/components/shadcn-studio/select/select-27'
import Select28 from '@/components/shadcn-studio/select/select-28'
import Select29 from '@/components/shadcn-studio/select/select-29'
import Select30 from '@/components/shadcn-studio/select/select-30'
import Select31 from '@/components/shadcn-studio/select/select-31'
import Select32 from '@/components/shadcn-studio/select/select-32'
import Select33 from '@/components/shadcn-studio/select/select-33'
import Select34 from '@/components/shadcn-studio/select/select-34'
import Select35 from '@/components/shadcn-studio/select/select-35'

export const metadata: Metadata = {
  title: 'Select family · Missa design review',
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
  { id: '01', label: 'Native default', note: 'Basic browser select', Component: Select01 },
  { id: '02', label: 'Native placeholder', note: 'Unselected state', Component: Select02 },
  { id: '03', label: 'Native with icon', note: 'Leading affordance', Component: Select03 },
  { id: '04', label: 'Native helper text', note: 'Supporting guidance', Component: Select04 },
  { id: '05', label: 'Native error', note: 'Validation state', Component: Select05 },
  { id: '06', label: 'Native required', note: 'Required state', Component: Select06 },
  { id: '07', label: 'Native option groups', note: 'Grouped choices', Component: Select07 },
  { id: '08', label: 'Native overlapping label', note: 'Label treatment', Component: Select08 },
  { id: '09', label: 'Native inset label', note: 'Label treatment', Component: Select09 },
  { id: '10', label: 'Default select', note: 'Custom menu', Component: Select10 },
  { id: '11', label: 'Placeholder', note: 'Unselected state', Component: Select11 },
  { id: '12', label: 'With icon', note: 'Leading affordance', Component: Select12 },
  { id: '13', label: 'Helper text', note: 'Supporting guidance', Component: Select13 },
  { id: '14', label: 'Error', note: 'Validation state', Component: Select14 },
  { id: '15', label: 'Sizes', note: 'Density comparison', Component: Select15 },
  { id: '16', label: 'Colored ring', note: 'Focus treatment', Component: Select16 },
  { id: '17', label: 'Background color', note: 'Surface treatment', Component: Select17 },
  { id: '18', label: 'Ghost select', note: 'Low-emphasis control', Component: Select18 },
  { id: '19', label: 'Disabled select', note: 'Unavailable state', Component: Select19 },
  { id: '20', label: 'Disabled options', note: 'Partial availability', Component: Select20 },
  { id: '21', label: 'Required', note: 'Required state', Component: Select21 },
  { id: '22', label: 'Option groups', note: 'Grouped choices', Component: Select22 },
  { id: '23', label: 'Separators', note: 'Grouped choices', Component: Select23 },
  { id: '24', label: 'Dark surface', note: 'Theme treatment', Component: Select24 },
  { id: '25', label: 'Custom styling', note: 'Surface treatment', Component: Select25 },
  { id: '26', label: 'Timezone select', note: 'Structured choices', Component: Select26 },
  { id: '27', label: 'Icon options', note: 'Visual choices', Component: Select27 },
  { id: '28', label: 'Leading text', note: 'Composed control', Component: Select28 },
  { id: '29', label: 'Status select', note: 'Semantic choices', Component: Select29 },
  { id: '30', label: 'Flag options', note: 'Geographic choices', Component: Select30 },
  { id: '31', label: 'Avatar options', note: 'People choices', Component: Select31 },
  { id: '32', label: 'Multiselect', note: 'Multiple choices', Component: Select32 },
  { id: '33', label: 'Multiselect clear', note: 'Reset action', Component: Select33 },
  { id: '34', label: 'Native multiple', note: 'Multiple choices', Component: Select34 },
  { id: '35', label: 'Listbox', note: 'Single selection', Component: Select35 },
]

const sections = [
  {
    title: 'Native foundations',
    description: 'Simple, resilient choices where browser-native behavior is the right trade-off.',
    ids: ['01', '02', '03', '04', '05', '06', '07', '08', '09'],
  },
  {
    title: 'Core select states',
    description: 'The default, validation, density, and surface treatments for product controls.',
    ids: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
  },
  {
    title: 'Structured choices',
    description: 'Grouped, semantic, visual, and domain-shaped options.',
    ids: ['22', '23', '24', '25', '26', '27', '28', '29', '30', '31'],
  },
  {
    title: 'Multiple selection',
    description: 'Multi-value and listbox patterns for filters and structured metadata.',
    ids: ['32', '33', '34', '35'],
  },
]

function ReferenceGrid({ ids }: { ids: string[] }) {
  return (
    <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
      {ids.map((id) => {
        const reference = references.find((item) => item.id === id)
        if (!reference) return null

        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-56 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-28 flex-1 items-center justify-center overflow-x-auto rounded-xl bg-muted/40 p-4'>
              <div className='flex w-full max-w-sm justify-center [&>div]:w-full'>
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
  ['Name the choice', 'Labels should tell people what decision they are making before they open the menu.'],
  ['Keep options legible', 'Use grouping, icons, and descriptions only when they improve recognition or comparison.'],
  ['Respect taxonomy', 'Missa filters and metadata must use canonical terms rather than presentation-only labels.'],
  ['Summarize multiple values', 'Multi-select controls should show the selected state without forcing users to reopen the menu.'],
]

export default function SelectsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1600px] px-6 py-12 lg:px-10'>
        <header className='max-w-3xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Selects should make choice and consequence clear.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 35 premium Shadcn Studio Select references are installed here for review. This is a
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='select-rules'>
          <div className='max-w-2xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='select-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa select rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              Native selects are valid when resilience and speed matter more than custom presentation.
              Custom selects are reserved for choices that genuinely need grouping, search, or richer
              recognition.
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

