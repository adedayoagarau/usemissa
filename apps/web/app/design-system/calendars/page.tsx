import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Calendar01 from '@/components/shadcn-studio/calendar/calendar-01'
import Calendar02 from '@/components/shadcn-studio/calendar/calendar-02'
import Calendar03 from '@/components/shadcn-studio/calendar/calendar-03'
import Calendar04 from '@/components/shadcn-studio/calendar/calendar-04'
import Calendar05 from '@/components/shadcn-studio/calendar/calendar-05'
import Calendar06 from '@/components/shadcn-studio/calendar/calendar-06'
import Calendar07 from '@/components/shadcn-studio/calendar/calendar-07'
import Calendar08 from '@/components/shadcn-studio/calendar/calendar-08'
import Calendar09 from '@/components/shadcn-studio/calendar/calendar-09'
import Calendar10 from '@/components/shadcn-studio/calendar/calendar-10'
import Calendar11 from '@/components/shadcn-studio/calendar/calendar-11'
import Calendar12 from '@/components/shadcn-studio/calendar/calendar-12'
import Calendar13 from '@/components/shadcn-studio/calendar/calendar-13'
import Calendar14 from '@/components/shadcn-studio/calendar/calendar-14'
import Calendar15 from '@/components/shadcn-studio/calendar/calendar-15'
import Calendar16 from '@/components/shadcn-studio/calendar/calendar-16'
import Calendar17 from '@/components/shadcn-studio/calendar/calendar-17'
import Calendar18 from '@/components/shadcn-studio/calendar/calendar-18'
import Calendar19 from '@/components/shadcn-studio/calendar/calendar-19'
import Calendar20 from '@/components/shadcn-studio/calendar/calendar-20'
import DatePicker01 from '@/components/shadcn-studio/date-picker/date-picker-01'
import DatePicker02 from '@/components/shadcn-studio/date-picker/date-picker-02'
import DatePicker03 from '@/components/shadcn-studio/date-picker/date-picker-03'
import DatePicker04 from '@/components/shadcn-studio/date-picker/date-picker-04'
import DatePicker05 from '@/components/shadcn-studio/date-picker/date-picker-05'
import DatePicker06 from '@/components/shadcn-studio/date-picker/date-picker-06'
import DatePicker07 from '@/components/shadcn-studio/date-picker/date-picker-07'
import DatePicker08 from '@/components/shadcn-studio/date-picker/date-picker-08'
import DatePicker09 from '@/components/shadcn-studio/date-picker/date-picker-09'
import DatePicker10 from '@/components/shadcn-studio/date-picker/date-picker-10'

export const metadata: Metadata = {
  title: 'Calendar and Date Picker family · Missa design review',
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

const calendarReferences: Reference[] = [
  { id: '01', label: 'Single month', note: 'Single date', Component: Calendar01 },
  { id: '02', label: 'Multi-month', note: 'Single date', Component: Calendar02 },
  { id: '03', label: 'Single-month range', note: 'Date range', Component: Calendar03 },
  { id: '04', label: 'Multi-month range', note: 'Date range', Component: Calendar04 },
  { id: '05', label: 'Minimum days', note: 'Range constraint', Component: Calendar05 },
  { id: '06', label: 'Disabled dates', note: 'Unavailable dates', Component: Calendar06 },
  { id: '07', label: 'Disabled weekends', note: 'Business rule', Component: Calendar07 },
  { id: '08', label: 'Localized strings', note: 'Locale treatment', Component: Calendar08 },
  { id: '09', label: 'Month/year dropdown', note: 'Navigation', Component: Calendar09 },
  { id: '10', label: 'Variable cell size', note: 'Responsive density', Component: Calendar10 },
  { id: '11', label: 'Events calendar', note: 'Calendar workflow', Component: Calendar11 },
  { id: '12', label: 'Multiple dates', note: 'Multi-select', Component: Calendar12 },
  { id: '13', label: 'Custom day', note: 'Day treatment', Component: Calendar13 },
  { id: '14', label: 'Custom range', note: 'Range treatment', Component: Calendar14 },
  { id: '15', label: 'Year/month right', note: 'Navigation', Component: Calendar15 },
  { id: '16', label: 'Year/month left', note: 'Navigation', Component: Calendar16 },
  { id: '17', label: 'Week numbers', note: 'Structured time', Component: Calendar17 },
  { id: '18', label: 'Today button', note: 'Quick navigation', Component: Calendar18 },
  { id: '19', label: 'Date input', note: 'Keyboard entry', Component: Calendar19 },
  { id: '20', label: 'Date + time input', note: 'Date-time entry', Component: Calendar20 },
]

const pickerReferences: Reference[] = [
  { id: '01', label: 'Date picker', note: 'Single date', Component: DatePicker01 },
  { id: '02', label: 'Date range picker', note: 'Date range', Component: DatePicker02 },
  { id: '03', label: 'Icon date picker', note: 'Compact trigger', Component: DatePicker03 },
  { id: '04', label: 'Natural language date', note: 'Text parsing', Component: DatePicker04 },
  { id: '05', label: 'Natural language range', note: 'Text parsing', Component: DatePicker05 },
  { id: '06', label: 'Short date display', note: 'Compact format', Component: DatePicker06 },
  { id: '07', label: 'No outside days', note: 'Calendar boundary', Component: DatePicker07 },
  { id: '08', label: 'Time picker', note: 'Time entry', Component: DatePicker08 },
  { id: '09', label: 'Time picker with icon', note: 'Compact time', Component: DatePicker09 },
  { id: '10', label: 'Date + time picker', note: 'Date-time entry', Component: DatePicker10 },
]

function ReferenceGrid({ references }: { references: Reference[] }) {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-[30rem] flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
            <div className='flex min-h-[25rem] flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-5'>
              <div className='flex w-full justify-center overflow-x-auto'>
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
  ['Store meaning, not formatting', 'Persist canonical date/time values with an explicit timezone policy; display formats are presentation.'],
  ['Name constraints', 'Disabled dates, minimum ranges, maximum ranges, and business-day rules must be explained before selection.'],
  ['Respect keyboard entry', 'Calendar navigation must complement direct input, not replace it for people who know the value.'],
  ['Be honest about locale', 'Month names, week starts, date order, and timezone labels must follow the intended locale and context.'],
]

export default function CalendarsDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Dates should be clear before they become data.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 20 premium Calendar references and 10 premium Date Picker references are installed
            here for review. This is a local library surface only; nothing has been promoted into
            product routes.
          </p>
        </header>

        <section className='mt-12' aria-labelledby='calendar-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='calendar-family' className='text-2xl font-semibold tracking-tight'>
                Calendar family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Single dates, ranges, disabled rules, navigation, localization, and calendar workflows.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {calendarReferences.length} references
            </p>
          </div>
          <ReferenceGrid references={calendarReferences} />
        </section>

        <section className='mt-16' aria-labelledby='date-picker-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='date-picker-family' className='text-2xl font-semibold tracking-tight'>
                Date and time picker family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Form controls that combine Calendar, Popover, Input, and date/time parsing.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {pickerReferences.length} references
            </p>
          </div>
          <ReferenceGrid references={pickerReferences} />
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='calendar-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='calendar-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa date and time rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down timezone, locale, storage, validation, and keyboard behavior as one coherent
              contract.
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

