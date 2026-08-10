import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import Resizable01 from '@/components/shadcn-studio/resizable/resizable-01'
import Resizable02 from '@/components/shadcn-studio/resizable/resizable-02'
import Resizable03 from '@/components/shadcn-studio/resizable/resizable-03'
import Resizable04 from '@/components/shadcn-studio/resizable/resizable-04'
import Resizable05 from '@/components/shadcn-studio/resizable/resizable-05'
import Resizable06 from '@/components/shadcn-studio/resizable/resizable-06'
import Resizable07 from '@/components/shadcn-studio/resizable/resizable-07'
import Resizable08 from '@/components/shadcn-studio/resizable/resizable-08'
import Resizable09 from '@/components/shadcn-studio/resizable/resizable-09'
import ScrollArea01 from '@/components/shadcn-studio/scroll-area/scroll-area-01'
import ScrollArea02 from '@/components/shadcn-studio/scroll-area/scroll-area-02'
import ScrollArea03 from '@/components/shadcn-studio/scroll-area/scroll-area-03'
import ScrollArea04 from '@/components/shadcn-studio/scroll-area/scroll-area-04'
import ScrollArea05 from '@/components/shadcn-studio/scroll-area/scroll-area-05'
import ScrollArea06 from '@/components/shadcn-studio/scroll-area/scroll-area-06'
import ContextMenu01 from '@/components/shadcn-studio/context-menu/context-menu-01'
import ContextMenu02 from '@/components/shadcn-studio/context-menu/context-menu-02'
import ContextMenu03 from '@/components/shadcn-studio/context-menu/context-menu-03'
import ContextMenu04 from '@/components/shadcn-studio/context-menu/context-menu-04'
import ContextMenu05 from '@/components/shadcn-studio/context-menu/context-menu-05'
import ContextMenu06 from '@/components/shadcn-studio/context-menu/context-menu-06'
import ContextMenu07 from '@/components/shadcn-studio/context-menu/context-menu-07'
import ContextMenu08 from '@/components/shadcn-studio/context-menu/context-menu-08'
import ContextMenu09 from '@/components/shadcn-studio/context-menu/context-menu-09'

export const metadata: Metadata = {
  title: 'Organization Layout and Context family · Missa design review',
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

const resizableReferences = createReferences(
  [Resizable01, Resizable02, Resizable03, Resizable04, Resizable05, Resizable06, Resizable07, Resizable08, Resizable09],
  [
    'Nested split panes',
    'Unobtrusive handle',
    'Vertical split',
    'Bento layout',
    'Sidebar and content',
    'Scaled handle',
    'Multiple panes',
    'Live size feedback',
    'Resizable columns table',
  ],
  'Pane layout',
)

const scrollAreaReferences = createReferences(
  [ScrollArea01, ScrollArea02, ScrollArea03, ScrollArea04, ScrollArea05, ScrollArea06],
  ['Vertical content', 'Horizontal feature strip', 'Scrollable dialog', 'Data table scroll', 'Gallery with fade', 'Horizontal gallery'],
  'Scoped scroll',
)

const contextMenuReferences = createReferences(
  [ContextMenu01, ContextMenu02, ContextMenu03, ContextMenu04, ContextMenu05, ContextMenu06, ContextMenu07, ContextMenu08, ContextMenu09],
  [
    'Basic actions',
    'Submenu',
    'Disabled and shortcuts',
    'Shortcut groups',
    'Labeled sections',
    'Icon actions',
    'Checkbox and radio items',
    'Context menu in a sheet',
    'Complete action menu',
  ],
  'Secondary action',
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
  ['Layout stays adjustable', 'Resizable panes need sensible minimums, visible handles, keyboard support, and a fallback that still works at narrow widths.'],
  ['Scroll has an owner', 'Every scroll surface should make its boundary, direction, focus behavior, and mobile fallback obvious.'],
  ['Context is supplemental', 'Right-click menus accelerate expert workflows; essential actions must remain visible through an ordinary button, link, or overflow control.'],
  ['State survives interaction', 'Pane sizes, selection context, menu dismissal, and focus return should remain predictable as the organization product changes.'],
]

const sections = [
  {
    id: 'resizable-family',
    title: 'Resizable family',
    description: 'Pane splits, handles, nested layouts, live sizing, and resizable table columns for dense organization surfaces.',
    references: resizableReferences,
  },
  {
    id: 'scroll-area-family',
    title: 'Scroll Area family',
    description: 'Vertical, horizontal, dialog, table, gallery, and fade treatments with an explicit scroll boundary.',
    references: scrollAreaReferences,
  },
  {
    id: 'context-menu-family',
    title: 'Context Menu family',
    description: 'Menus, submenus, shortcuts, labels, icons, selection controls, sheets, and complete secondary-action patterns.',
    references: contextMenuReferences,
  },
]

export default function WorkspaceLayoutDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Organization should give structure to complexity.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 9 premium Resizable, 6 premium Scroll Area, and 9 premium Context Menu references
            are installed here for review. This is a local library surface only; nothing has been
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='organization-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='organization-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa organization-product rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down pane ownership, scroll boundaries, keyboard behavior, context-menu
              discoverability, and persistence as one coherent organization-product contract.
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
