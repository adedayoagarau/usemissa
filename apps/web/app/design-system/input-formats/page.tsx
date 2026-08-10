import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import InputMask01 from '@/components/shadcn-studio/input-mask/input-mask-01'
import InputMask02 from '@/components/shadcn-studio/input-mask/input-mask-02'
import InputMask03 from '@/components/shadcn-studio/input-mask/input-mask-03'
import InputMask04 from '@/components/shadcn-studio/input-mask/input-mask-04'
import InputMask05 from '@/components/shadcn-studio/input-mask/input-mask-05'
import InputMask06 from '@/components/shadcn-studio/input-mask/input-mask-06'
import PhoneInput01 from '@/components/shadcn-studio/phone-input/phone-input-01'
import PhoneInput02 from '@/components/shadcn-studio/phone-input/phone-input-02'
import PhoneInput03 from '@/components/shadcn-studio/phone-input/phone-input-03'
import PhoneInput04 from '@/components/shadcn-studio/phone-input/phone-input-04'
import PhoneInput05 from '@/components/shadcn-studio/phone-input/phone-input-05'
import PhoneInput06 from '@/components/shadcn-studio/phone-input/phone-input-06'
import PhoneInput07 from '@/components/shadcn-studio/phone-input/phone-input-07'
import PhoneInput08 from '@/components/shadcn-studio/phone-input/phone-input-08'
import PhoneInput09 from '@/components/shadcn-studio/phone-input/phone-input-09'

export const metadata: Metadata = {
  title: 'Input Formatting family · Missa design review',
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

const inputMaskReferences = createReferences(
  [InputMask01, InputMask02, InputMask03, InputMask04, InputMask05, InputMask06],
  ['Text mask', 'Time mask', 'Card number', 'Expiry date', 'CVC code', 'Card details'],
  'Structured input',
)

const phoneInputReferences = createReferences(
  [PhoneInput01, PhoneInput02, PhoneInput03, PhoneInput04, PhoneInput05, PhoneInput06, PhoneInput07, PhoneInput08, PhoneInput09],
  [
    'Default phone input',
    'Labeled phone input',
    'Input sizes',
    'Disabled input',
    'Rounded input',
    'Helper text',
    'Pre-filled input',
    'Invalid input',
    'Read-only input',
  ],
  'Phone input',
)

function ReferenceGrid({ references }: { references: Reference[] }) {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-80 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-56 flex-1 items-center justify-center overflow-auto rounded-xl bg-muted/40 p-5'>
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
  ['Format without hiding', 'Masks should guide valid structure while keeping the expected format visible and allowing people to correct or paste values naturally.'],
  ['Country choice is explicit', 'Phone inputs need a clear country selector, sensible defaults, accessible labels, and a safe path for international numbers.'],
  ['Validation is specific', 'Invalid, disabled, read-only, and helper states should explain what the person can do next without exposing implementation detail.'],
  ['Payments stay trustworthy', 'Card fields must preserve autofill, keyboard, screen-reader labels, and predictable grouping without implying that the UI validates a payment.'],
]

const sections = [
  {
    id: 'input-mask-family',
    title: 'Input Mask family',
    description: 'Text, time, card number, expiry, CVC, and grouped card-detail patterns for structured values.',
    references: inputMaskReferences,
  },
  {
    id: 'phone-input-family',
    title: 'Phone Input family',
    description: 'Default, labeled, sized, disabled, rounded, helper, pre-filled, invalid, and read-only phone inputs.',
    references: phoneInputReferences,
  },
]

export default function InputFormatsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Structured input should reduce uncertainty.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 6 premium Input Mask and 9 premium Phone Input references are installed here for
            review. This is a local library surface only; nothing has been promoted into product
            routes.
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='input-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='input-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa structured-input rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down formatting behavior, country selection, validation timing, autofill, and
              accessible error recovery as one coherent input contract.
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

