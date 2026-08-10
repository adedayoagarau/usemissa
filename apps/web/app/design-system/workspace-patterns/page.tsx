import type { Metadata } from 'next'

import {
  createReviewReferences,
  ReviewReferenceGrid,
} from '@/components/shadcn-studio/review-grid'

import Drawer01 from '@/components/shadcn-studio/drawer/drawer-01'
import Drawer02 from '@/components/shadcn-studio/drawer/drawer-02'
import Drawer03 from '@/components/shadcn-studio/drawer/drawer-03'
import Drawer04 from '@/components/shadcn-studio/drawer/drawer-04'
import Drawer05 from '@/components/shadcn-studio/drawer/drawer-05'
import Drawer06 from '@/components/shadcn-studio/drawer/drawer-06'
import Drawer07 from '@/components/shadcn-studio/drawer/drawer-07'
import Drawer08 from '@/components/shadcn-studio/drawer/drawer-08'
import Drawer09 from '@/components/shadcn-studio/drawer/drawer-09'
import Drawer10 from '@/components/shadcn-studio/drawer/drawer-10'
import Drawer11 from '@/components/shadcn-studio/drawer/drawer-11'
import Drawer12 from '@/components/shadcn-studio/drawer/drawer-12'
import Drawer13 from '@/components/shadcn-studio/drawer/drawer-13'
import Drawer14 from '@/components/shadcn-studio/drawer/drawer-14'
import Drawer15 from '@/components/shadcn-studio/drawer/drawer-15'
import Kanban01 from '@/components/shadcn-studio/kanban/kanban-01'
import Kanban02 from '@/components/shadcn-studio/kanban/kanban-02'
import Kanban03 from '@/components/shadcn-studio/kanban/kanban-03'
import Kanban04 from '@/components/shadcn-studio/kanban/kanban-04'
import List01 from '@/components/shadcn-studio/list/list-01'
import List02 from '@/components/shadcn-studio/list/list-02'
import List03 from '@/components/shadcn-studio/list/list-03'
import List04 from '@/components/shadcn-studio/list/list-04'
import List05 from '@/components/shadcn-studio/list/list-05'
import List06 from '@/components/shadcn-studio/list/list-06'
import List07 from '@/components/shadcn-studio/list/list-07'
import List08 from '@/components/shadcn-studio/list/list-08'
import List09 from '@/components/shadcn-studio/list/list-09'
import List10 from '@/components/shadcn-studio/list/list-10'
import Sortable01 from '@/components/shadcn-studio/sortable/sortable-01'
import Sortable02 from '@/components/shadcn-studio/sortable/sortable-02'
import Sortable03 from '@/components/shadcn-studio/sortable/sortable-03'
import Sortable04 from '@/components/shadcn-studio/sortable/sortable-04'
import Sortable05 from '@/components/shadcn-studio/sortable/sortable-05'

export const metadata: Metadata = {
  title: "Organization Patterns family · Missa design review",
  robots: {
    index: false,
    follow: false,
  },
}

const drawerReferences = createReviewReferences(
  [Drawer01, Drawer02, Drawer03, Drawer04, Drawer05, Drawer06, Drawer07, Drawer08, Drawer09, Drawer10, Drawer11, Drawer12, Drawer13, Drawer14, Drawer15],
  ["Basic drawer","Form drawer","Scrollable content","All sides","Right-side panel","No overlay","Custom overlay","Max-length form","Notifications","File tree","Settings","Filters","Cart","Profile","Profile form"],
  "Organization surface",
)

const kanbanReferences = createReviewReferences(
  [Kanban01, Kanban02, Kanban03, Kanban04],
  ["Task board","Task board compact","Initiative board","Task board with status"],
  "Organize work",
)

const listReferences = createReviewReferences(
  [List01, List02, List03, List04, List05, List06, List07, List08, List09, List10],
  ["Basic list","Notifications","Items list","Icon list","Action list","Users list","Compact users","Progress list","List item","Metadata list"],
  "Scannable collection",
)

const sortableReferences = createReviewReferences(
  [Sortable01, Sortable02, Sortable03, Sortable04, Sortable05],
  ["Basic sortable","Avatar list","Grouped items","Notification channels","Task rows"],
  "Reorderable state",
)

const sections = [
  {
    id: 'drawer',
    title: "Drawer family",
    description: "Side panels, forms, filters, notifications, file trees, carts, profiles, and custom overlay treatments.",
    references: drawerReferences,
  },
  {
    id: 'kanban',
    title: "Kanban family",
    description: "Task and initiative boards with movable cards for organizing work and operational state.",
    references: kanbanReferences,
  },
  {
    id: 'list',
    title: "List family",
    description: "Notifications, users, progress, metadata, icons, and action-oriented list surfaces.",
    references: listReferences,
  },
  {
    id: 'sortable',
    title: "Sortable family",
    description: "Reorderable lists, grouped items, notification channels, avatars, and task rows.",
    references: sortableReferences,
  },
]

const rules = [
  [
    "Panels have an owner",
    "Drawers should reveal context without hiding the main task, and essential actions must remain discoverable outside the panel."
  ],
  [
    "Movement is explicit",
    "Kanban and sortable surfaces need clear drag affordances, keyboard alternatives, stable ordering, and safe persistence."
  ],
  [
    "Lists stay scannable",
    "A list should expose one dominant fact or action per row and switch to a responsive fallback when density becomes noise."
  ],
  [
    "State is recoverable",
    "Reordering, filtering, drawer edits, and board changes need clear pending, success, error, and undo behavior."
  ]
]

export default function DesignSystemReviewPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Organization structure should remain navigable under pressure.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 15 premium Drawer, 4 premium Kanban, 10 premium List, and 5 premium Sortable references are installed here for review. This is a local library surface only; nothing has been promoted into product
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
              <ReviewReferenceGrid references={section.references} />
            </section>
          ))}
        </section>

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='review-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='review-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa review rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us interaction range. Before product adoption, we will
              lock down semantics, keyboard behavior, responsive fallbacks, state persistence, and
              accessibility as one coherent product contract.
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
