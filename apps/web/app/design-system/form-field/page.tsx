import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Form01 from '@/components/shadcn-studio/form/form-01'
import Form02 from '@/components/shadcn-studio/form/form-02'
import Form03 from '@/components/shadcn-studio/form/form-03'
import Form04 from '@/components/shadcn-studio/form/form-04'
import Form05 from '@/components/shadcn-studio/form/form-05'
import Form06 from '@/components/shadcn-studio/form/form-06'
import Form07 from '@/components/shadcn-studio/form/form-07'
import Form08 from '@/components/shadcn-studio/form/form-08'
import Form09 from '@/components/shadcn-studio/form/form-09'
import Form10 from '@/components/shadcn-studio/form/form-10'
import InputOTP01 from '@/components/shadcn-studio/input-otp/input-otp-01'
import InputOTP02 from '@/components/shadcn-studio/input-otp/input-otp-02'
import InputOTP03 from '@/components/shadcn-studio/input-otp/input-otp-03'
import InputOTP04 from '@/components/shadcn-studio/input-otp/input-otp-04'
import InputOTP05 from '@/components/shadcn-studio/input-otp/input-otp-05'
import InputOTP06 from '@/components/shadcn-studio/input-otp/input-otp-06'
import InputOTP07 from '@/components/shadcn-studio/input-otp/input-otp-07'
import InputOTP08 from '@/components/shadcn-studio/input-otp/input-otp-08'
import InputOTP09 from '@/components/shadcn-studio/input-otp/input-otp-09'
import InputOTP10 from '@/components/shadcn-studio/input-otp/input-otp-10'
import Textarea01 from '@/components/shadcn-studio/textarea/textarea-01'
import Textarea02 from '@/components/shadcn-studio/textarea/textarea-02'
import Textarea03 from '@/components/shadcn-studio/textarea/textarea-03'
import Textarea04 from '@/components/shadcn-studio/textarea/textarea-04'
import Textarea05 from '@/components/shadcn-studio/textarea/textarea-05'
import Textarea06 from '@/components/shadcn-studio/textarea/textarea-06'
import Textarea07 from '@/components/shadcn-studio/textarea/textarea-07'
import Textarea08 from '@/components/shadcn-studio/textarea/textarea-08'
import Textarea09 from '@/components/shadcn-studio/textarea/textarea-09'
import Textarea10 from '@/components/shadcn-studio/textarea/textarea-10'
import Textarea11 from '@/components/shadcn-studio/textarea/textarea-11'
import Textarea12 from '@/components/shadcn-studio/textarea/textarea-12'
import Textarea13 from '@/components/shadcn-studio/textarea/textarea-13'
import Textarea14 from '@/components/shadcn-studio/textarea/textarea-14'
import Textarea15 from '@/components/shadcn-studio/textarea/textarea-15'
import Textarea16 from '@/components/shadcn-studio/textarea/textarea-16'
import Textarea17 from '@/components/shadcn-studio/textarea/textarea-17'
import Textarea18 from '@/components/shadcn-studio/textarea/textarea-18'
import Textarea19 from '@/components/shadcn-studio/textarea/textarea-19'
import Textarea20 from '@/components/shadcn-studio/textarea/textarea-20'
import Label01 from '@/components/shadcn-studio/label/label-01'
import Label02 from '@/components/shadcn-studio/label/label-02'
import Label03 from '@/components/shadcn-studio/label/label-03'
import Label04 from '@/components/shadcn-studio/label/label-04'
import Label05 from '@/components/shadcn-studio/label/label-05'
import Label06 from '@/components/shadcn-studio/label/label-06'
import Label07 from '@/components/shadcn-studio/label/label-07'
import Label08 from '@/components/shadcn-studio/label/label-08'
import Label09 from '@/components/shadcn-studio/label/label-09'

export const metadata: Metadata = {
  title: 'Form and Field family · Missa design review',
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

const formComponents: ComponentType[] = [Form01, Form02, Form03, Form04, Form05, Form06, Form07, Form08, Form09, Form10]
const inputotpComponents: ComponentType[] = [InputOTP01, InputOTP02, InputOTP03, InputOTP04, InputOTP05, InputOTP06, InputOTP07, InputOTP08, InputOTP09, InputOTP10]
const textareaComponents: ComponentType[] = [Textarea01, Textarea02, Textarea03, Textarea04, Textarea05, Textarea06, Textarea07, Textarea08, Textarea09, Textarea10, Textarea11, Textarea12, Textarea13, Textarea14, Textarea15, Textarea16, Textarea17, Textarea18, Textarea19, Textarea20]
const labelComponents: ComponentType[] = [Label01, Label02, Label03, Label04, Label05, Label06, Label07, Label08, Label09]

const formLabels = ["Preferences form","Community signup","Daily tracker","Password reset","One-time password","Profile form","Account recovery","Payment method","Date form","Issue report"]
const inputotpLabels = ["Numeric OTP","Alphanumeric OTP","OTP with resend","Resend timer","Outlined OTP","Filled OTP","Minimal OTP","Grouped OTP","Outlined grouped OTP","Custom separator"]
const textareaLabels = ["Default textarea","With label","Helper text","Right helper text","Invalid textarea","Hint text","Required textarea","Colored border","Filled textarea","Textarea sizes","Start icon","End icon","Overlapping label","Floating label","Inset label","With button","Auto-grow","No resize","Character count","Read-only textarea"]
const labelLabels = ["Checkbox label","Input label","Tooltip label","Badge label","Button label","Status label","Textarea label","Switch label","Form label"]

const formReferences = createReferences(formComponents, formLabels, 'Validated workflow')
const inputotpReferences = createReferences(inputotpComponents, inputotpLabels, 'Verification input')
const textareaReferences = createReferences(textareaComponents, textareaLabels, 'Long-form input')
const labelReferences = createReferences(labelComponents, labelLabels, 'Accessible naming')

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
  ['Every field has a name', 'Labels, descriptions, errors, and controls must stay associated so people understand what is required and what went wrong.'],
  ['Validation is actionable', 'Errors should explain the correction, preserve entered data, and appear at the right time—not punish people for exploring a form.'],
  ['Submission is honest', 'Pending, success, failure, and retry states must reflect the actual request lifecycle and prevent accidental duplicate actions.'],
  ['Long input stays usable', 'Textarea, OTP, and multi-step patterns need keyboard support, mobile-safe targets, character guidance, and predictable focus.'],
]

const sections = [
  {
    id: 'form-family',
    title: 'Form family',
    description: 'Validated workflows for preferences, authentication, profile, payment, date, and issue reporting.',
    references: formReferences,
  },
  {
    id: 'input-otp-family',
    title: 'Input OTP family',
    description: 'Verification inputs with numeric, alphanumeric, resend, timer, grouped, and custom separator treatments.',
    references: inputotpReferences,
  },
  {
    id: 'textarea-family',
    title: 'Textarea family',
    description: 'Long-form input with helper text, errors, labels, icons, sizing, character count, and action treatments.',
    references: textareaReferences,
  },
  {
    id: 'label-family',
    title: 'Label family',
    description: 'Accessible naming patterns for controls, statuses, actions, and form structures.',
    references: labelReferences,
  },
]

export default function FormFieldDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Forms should make completion feel safe.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 10 premium Form, 10 premium Input OTP, 20 premium Textarea, and 9 premium Label
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='form-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='form-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa form rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down field naming, validation timing, request lifecycles, server errors,
              accessibility announcements, and focus recovery as one coherent contract.
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

