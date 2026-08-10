import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Menu01 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-01'
import Menu02 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-02'
import Menu03 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-03'
import Menu04 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-04'
import Menu05 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-05'
import Menu06 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-06'
import Menu07 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-07'
import Menu08 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-08'
import Menu09 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-09'
import Menu10 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-10'
import Menu11 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-11'
import Menu12 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-12'
import Menu13 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-13'
import Menu14 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-14'
import Menu15 from '@/components/shadcn-studio/dropdown-menu/dropdown-menu-15'

export const metadata: Metadata = {
  title: 'Dropdown menu family · Missa design review',
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
  { id: '01', label: 'Basic menu', note: 'Groups and submenu', Component: Menu01 },
  { id: '02', label: 'Task assignment', note: 'Avatar options', Component: Menu02 },
  { id: '03', label: 'Chat list', note: 'Unread state', Component: Menu03 },
  { id: '04', label: 'Contact actions', note: 'Inline actions', Component: Menu04 },
  { id: '05', label: 'Meeting schedule', note: 'Switch controls', Component: Menu05 },
  { id: '06', label: 'Edit text', note: 'Context actions', Component: Menu06 },
  { id: '07', label: 'Account menu', note: 'Avatar + actions', Component: Menu07 },
  { id: '08', label: 'User profile', note: 'Profile menu', Component: Menu08 },
  { id: '09', label: 'Align start', note: 'Destructive action', Component: Menu09 },
  { id: '10', label: 'Align end', note: 'Placement', Component: Menu10 },
  { id: '11', label: 'Bordered menu', note: 'Surface treatment', Component: Menu11 },
  { id: '12', label: 'Icon items', note: 'Recognition', Component: Menu12 },
  { id: '13', label: 'Checkbox items', note: 'Multi-toggle', Component: Menu13 },
  { id: '14', label: 'Radio items', note: 'Single choice', Component: Menu14 },
  { id: '15', label: 'Slide-left animation', note: 'Motion treatment', Component: Menu15 },
]

function ReferenceGrid() {
  return (
    <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
      {references.map((reference) => {
        const Demo = reference.Component

        return (
          <article key={reference.id} className='flex min-h-56 flex-col rounded-2xl border bg-card p-5 shadow-sm'>
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
  ['Actions, not navigation', 'Use menus for contextual actions and choices; use Breadcrumbs or primary navigation for movement.'],
  ['Keep the trigger honest', 'The trigger label should describe what opens, especially for account, filter, and row-action menus.'],
  ['Use destructive sparingly', 'Destructive actions stay visually and semantically distinct, with confirmation when consequences are serious.'],
  ['Keyboard is first-class', 'Menu order, focus, escape, and nested submenus must remain predictable without a pointer.'],
]

export default function DropdownMenusDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1600px] px-6 py-12 lg:px-10'>
        <header className='max-w-3xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Menus should reveal the next useful action.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 15 premium Shadcn Studio Dropdown Menu references are installed here for review.
            This is a local library surface only; nothing has been promoted into product routes.
          </p>
        </header>

        <section className='mt-12' aria-labelledby='dropdown-menu-family'>
          <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 id='dropdown-menu-family' className='text-2xl font-semibold tracking-tight'>
                Dropdown Menu family
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Account menus, contextual actions, toggles, submenus, and placement treatments.
              </p>
            </div>
            <p className='text-xs uppercase tracking-[0.14em] text-muted-foreground'>
              {references.length} references
            </p>
          </div>
          <ReferenceGrid />
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='menu-rules'>
          <div className='max-w-2xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='menu-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa menu rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              We will choose a calm organization default and reserve richer avatar, toggle, and
              animated treatments for contexts where they improve recognition or speed.
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

