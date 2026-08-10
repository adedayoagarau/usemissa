import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Input01 from '@/components/shadcn-studio/input/input-01'
import Input02 from '@/components/shadcn-studio/input/input-02'
import Input03 from '@/components/shadcn-studio/input/input-03'
import Input04 from '@/components/shadcn-studio/input/input-04'
import Input05 from '@/components/shadcn-studio/input/input-05'
import Input06 from '@/components/shadcn-studio/input/input-06'
import Input07 from '@/components/shadcn-studio/input/input-07'
import Input08 from '@/components/shadcn-studio/input/input-08'
import Input09 from '@/components/shadcn-studio/input/input-09'
import Input10 from '@/components/shadcn-studio/input/input-10'
import Input11 from '@/components/shadcn-studio/input/input-11'
import Input12 from '@/components/shadcn-studio/input/input-12'
import Input13 from '@/components/shadcn-studio/input/input-13'
import Input14 from '@/components/shadcn-studio/input/input-14'
import Input15 from '@/components/shadcn-studio/input/input-15'
import Input16 from '@/components/shadcn-studio/input/input-16'
import Input17 from '@/components/shadcn-studio/input/input-17'
import Input18 from '@/components/shadcn-studio/input/input-18'
import Input19 from '@/components/shadcn-studio/input/input-19'
import Input20 from '@/components/shadcn-studio/input/input-20'
import Input21 from '@/components/shadcn-studio/input/input-21'
import Input22 from '@/components/shadcn-studio/input/input-22'
import Input23 from '@/components/shadcn-studio/input/input-23'
import Input24 from '@/components/shadcn-studio/input/input-24'
import Input25 from '@/components/shadcn-studio/input/input-25'
import Input26 from '@/components/shadcn-studio/input/input-26'
import Input27 from '@/components/shadcn-studio/input/input-27'
import Input28 from '@/components/shadcn-studio/input/input-28'
import Input29 from '@/components/shadcn-studio/input/input-29'
import Input30 from '@/components/shadcn-studio/input/input-30'
import Input31 from '@/components/shadcn-studio/input/input-31'
import Input32 from '@/components/shadcn-studio/input/input-32'
import Input33 from '@/components/shadcn-studio/input/input-33'
import Input34 from '@/components/shadcn-studio/input/input-34'
import Input35 from '@/components/shadcn-studio/input/input-35'
import Input36 from '@/components/shadcn-studio/input/input-36'
import Input37 from '@/components/shadcn-studio/input/input-37'
import Input38 from '@/components/shadcn-studio/input/input-38'
import Input39 from '@/components/shadcn-studio/input/input-39'
import Input40 from '@/components/shadcn-studio/input/input-40'
import Input41 from '@/components/shadcn-studio/input/input-41'
import Input42 from '@/components/shadcn-studio/input/input-42'
import Input43 from '@/components/shadcn-studio/input/input-43'
import Input44 from '@/components/shadcn-studio/input/input-44'
import Input45 from '@/components/shadcn-studio/input/input-45'

export const metadata: Metadata = {
  title: 'Input family · Missa design review',
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
  { id: '01', label: 'Email input', note: 'Basic text control', Component: Input01 },
  { id: '02', label: 'With label', note: 'Label association', Component: Input02 },
  { id: '03', label: 'Required', note: 'Required state', Component: Input03 },
  { id: '04', label: 'Disabled', note: 'Unavailable state', Component: Input04 },
  { id: '05', label: 'Read-only', note: 'Non-editable value', Component: Input05 },
  { id: '06', label: 'Sizes', note: 'Density comparison', Component: Input06 },
  { id: '07', label: 'Default value', note: 'Persisted value', Component: Input07 },
  { id: '08', label: 'Rounded', note: 'Marketing-only shape', Component: Input08 },
  { id: '09', label: 'Helper start', note: 'Supporting guidance', Component: Input09 },
  { id: '10', label: 'Helper end', note: 'Supporting guidance', Component: Input10 },
  { id: '11', label: 'Optional hint', note: 'Optional field', Component: Input11 },
  { id: '12', label: 'Error', note: 'Validation state', Component: Input12 },
  { id: '13', label: 'Colored ring', note: 'Focus treatment', Component: Input13 },
  { id: '14', label: 'Start icon', note: 'Icon group', Component: Input14 },
  { id: '15', label: 'End icon', note: 'Icon group', Component: Input15 },
  { id: '16', label: 'Start prefix', note: 'Text add-on', Component: Input16 },
  { id: '17', label: 'End suffix', note: 'Text add-on', Component: Input17 },
  { id: '18', label: 'Two add-ons', note: 'Composed control', Component: Input18 },
  { id: '19', label: 'Start action', note: 'Button group', Component: Input19 },
  { id: '20', label: 'End action', note: 'Button group', Component: Input20 },
  { id: '21', label: 'Both actions', note: 'Button group', Component: Input21 },
  { id: '22', label: 'Filled', note: 'Surface treatment', Component: Input22 },
  { id: '23', label: 'Overlapping label', note: 'Label treatment', Component: Input23 },
  { id: '24', label: 'Floating label', note: 'Label treatment', Component: Input24 },
  { id: '25', label: 'Inset label', note: 'Label treatment', Component: Input25 },
  { id: '26', label: 'Password', note: 'Visibility action', Component: Input26 },
  { id: '27', label: 'File', note: 'Upload entry', Component: Input27 },
  { id: '28', label: 'Start select', note: 'Select + input', Component: Input28 },
  { id: '29', label: 'End select', note: 'Select + input', Component: Input29 },
  { id: '30', label: 'Input button', note: 'Inline action', Component: Input30 },
  { id: '31', label: 'Submit icon', note: 'Inline action', Component: Input31 },
  { id: '32', label: 'Download action', note: 'Inline action', Component: Input32 },
  { id: '33', label: 'End button', note: 'Inline action', Component: Input33 },
  { id: '34', label: 'Character limit', note: 'Constraint feedback', Component: Input34 },
  { id: '35', label: 'Characters left', note: 'Constraint feedback', Component: Input35 },
  { id: '36', label: 'Clear action', note: 'Reset action', Component: Input36 },
  { id: '37', label: 'Search shortcut', note: 'Keyboard affordance', Component: Input37 },
  { id: '38', label: 'Search + mic', note: 'Search affordance', Component: Input38 },
  { id: '39', label: 'Search loading', note: 'Async state', Component: Input39 },
  { id: '40', label: 'Number stepper', note: 'Quantity control', Component: Input40 },
  { id: '41', label: 'Number end buttons', note: 'Quantity control', Component: Input41 },
  { id: '42', label: 'Number stacked', note: 'Quantity control', Component: Input42 },
  { id: '43', label: 'Rounded stepper', note: 'Marketing-only shape', Component: Input43 },
  { id: '44', label: 'Rounded actions', note: 'Marketing-only shape', Component: Input44 },
  { id: '45', label: 'Stacked chevrons', note: 'Quantity control', Component: Input45 },
]

const sections = [
  { title: 'Basics', description: 'The states every product surface needs.', ids: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'] },
  { title: 'Composition', description: 'Add-ons, labels, icons, and grouped controls.', ids: ['14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'] },
  { title: 'Actions and feedback', description: 'Inputs with action affordances and async feedback.', ids: ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39'] },
  { title: 'Quantity controls', description: 'Number entry patterns for structured values.', ids: ['40', '41', '42', '43', '44', '45'] },
]

function ReferenceGrid({ ids }: { ids: string[] }) {
  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
      {ids.map((id) => {
        const reference = references.find((item) => item.id === id)
        if (!reference) return null

        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-56 flex-col rounded-2xl border bg-card p-4 shadow-sm'>
            <div className='mb-5 flex items-start justify-between gap-3'>
              <div>
                <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                  {reference.id}
                </p>
                <h3 className='mt-1 text-sm font-semibold'>{reference.label}</h3>
              </div>
              <span className='rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground'>
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

const fieldRules = [
  ['Label first', 'Every field gets a visible, programmatically associated label.'],
  ['Help and error', 'Supporting text and validation use stable descriptions, never placeholder text.'],
  ['Touch rhythm', 'Creator flows use comfortable controls; organization flows can be compact when the task allows it.'],
  ['No surprise motion', 'Focus, error, loading, and disabled states remain calm and predictable.'],
]

export default function InputsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1600px] px-6 py-12 lg:px-10'>
        <header className='max-w-3xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Inputs should make the next answer obvious.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 45 premium Shadcn Studio Input references are installed here for review. This is a
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='field-contract'>
          <div className='max-w-2xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='field-contract' className='mt-3 text-2xl font-semibold tracking-tight'>
              Field behavior around the Input family
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              Shadcn Studio does not expose a premium Field catalog page, so we are not installing
              a free substitute. Missa will define Field as the accessibility and spacing contract
              around these approved premium controls.
            </p>
          </div>
          <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {fieldRules.map(([title, description]) => (
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
