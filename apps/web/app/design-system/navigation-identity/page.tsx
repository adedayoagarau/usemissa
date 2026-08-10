import type { ComponentType } from 'react'
import type { Metadata } from 'next'

import NavigationMenu01 from '@/components/shadcn-studio/navigation-menu/navigation-menu-01'
import NavigationMenu02 from '@/components/shadcn-studio/navigation-menu/navigation-menu-02'
import NavigationMenu03 from '@/components/shadcn-studio/navigation-menu/navigation-menu-03'
import NavigationMenu04 from '@/components/shadcn-studio/navigation-menu/navigation-menu-04'
import NavigationMenu05 from '@/components/shadcn-studio/navigation-menu/navigation-menu-05'
import NavigationMenu06 from '@/components/shadcn-studio/navigation-menu/navigation-menu-06'
import NavigationMenu07 from '@/components/shadcn-studio/navigation-menu/navigation-menu-07'
import NavigationMenu08 from '@/components/shadcn-studio/navigation-menu/navigation-menu-08'
import NavigationMenu09 from '@/components/shadcn-studio/navigation-menu/navigation-menu-09'
import Menubar01 from '@/components/shadcn-studio/menubar/menubar-01'
import Menubar02 from '@/components/shadcn-studio/menubar/menubar-02'
import Menubar03 from '@/components/shadcn-studio/menubar/menubar-03'
import Menubar04 from '@/components/shadcn-studio/menubar/menubar-04'
import Menubar05 from '@/components/shadcn-studio/menubar/menubar-05'
import Menubar06 from '@/components/shadcn-studio/menubar/menubar-06'
import Menubar07 from '@/components/shadcn-studio/menubar/menubar-07'
import Menubar08 from '@/components/shadcn-studio/menubar/menubar-08'
import Avatar01 from '@/components/shadcn-studio/avatar/avatar-01'
import Avatar02 from '@/components/shadcn-studio/avatar/avatar-02'
import Avatar03 from '@/components/shadcn-studio/avatar/avatar-03'
import Avatar04 from '@/components/shadcn-studio/avatar/avatar-04'
import Avatar05 from '@/components/shadcn-studio/avatar/avatar-05'
import Avatar06 from '@/components/shadcn-studio/avatar/avatar-06'
import Avatar07 from '@/components/shadcn-studio/avatar/avatar-07'
import Avatar08 from '@/components/shadcn-studio/avatar/avatar-08'
import Avatar09 from '@/components/shadcn-studio/avatar/avatar-09'
import Avatar10 from '@/components/shadcn-studio/avatar/avatar-10'
import Avatar11 from '@/components/shadcn-studio/avatar/avatar-11'
import Avatar12 from '@/components/shadcn-studio/avatar/avatar-12'
import Avatar13 from '@/components/shadcn-studio/avatar/avatar-13'
import Avatar14 from '@/components/shadcn-studio/avatar/avatar-14'
import Avatar15 from '@/components/shadcn-studio/avatar/avatar-15'
import Avatar16 from '@/components/shadcn-studio/avatar/avatar-16'
import Avatar17 from '@/components/shadcn-studio/avatar/avatar-17'
import Avatar18 from '@/components/shadcn-studio/avatar/avatar-18'
import Avatar19 from '@/components/shadcn-studio/avatar/avatar-19'
import Avatar20 from '@/components/shadcn-studio/avatar/avatar-20'

export const metadata: Metadata = {
  title: 'Navigation and Identity family · Missa design review',
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

const navigationmenuComponents: ComponentType[] = [NavigationMenu01, NavigationMenu02, NavigationMenu03, NavigationMenu04, NavigationMenu05, NavigationMenu06, NavigationMenu07, NavigationMenu08, NavigationMenu09]
const menubarComponents: ComponentType[] = [Menubar01, Menubar02, Menubar03, Menubar04, Menubar05, Menubar06, Menubar07, Menubar08]
const avatarComponents: ComponentType[] = [Avatar01, Avatar02, Avatar03, Avatar04, Avatar05, Avatar06, Avatar07, Avatar08, Avatar09, Avatar10, Avatar11, Avatar12, Avatar13, Avatar14, Avatar15, Avatar16, Avatar17, Avatar18, Avatar19, Avatar20]

const navigationmenuLabels = ["Default navigation","Two-column navigation","Feature navigation","Section navigation","Product navigation","Developer tools","Tools and integrations","Stats navigation","Getting started"]
const menubarLabels = ["Default menubar","Checkbox menu","Radio menu","Submenu","Icon menu","Combined menu","Labeled menu","Mixed menu"]
const avatarLabels = ["Default avatar","Ring avatar","Rounded avatar","Avatar sizes","Fallback avatar","Icon fallback","Busy status","Status ring","Away status","Plus avatar","Notification badge","Verified avatar","Avatar group","Stacked group","Group with count","Group with menu","Group with status","Group with fallback","Add avatar","Mixed group"]

const navigationmenuReferences = createReferences(navigationmenuComponents, navigationmenuLabels, 'Primary navigation')
const menubarReferences = createReferences(menubarComponents, menubarLabels, 'Desktop menu')
const avatarReferences = createReferences(avatarComponents, avatarLabels, 'Identity')

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
  ['Navigation has hierarchy', 'Primary navigation, local navigation, menus, and contextual links should not compete for the same visual role.'],
  ['Identity is meaningful', 'Avatar, status, verification, and group treatments must reflect real identity or relationship data—not decoration.'],
  ['Menus preserve context', 'Menubars and navigation menus need predictable keyboard behavior, clear focus, and a safe mobile fallback.'],
  ['Shells stay calm', 'Navigation surfaces should orient people without turning every route, filter, or action into a competing accent.'],
]

const sections = [
  {
    id: 'navigation-menu-family',
    title: 'Navigation Menu family',
    description: 'Primary and contextual navigation patterns for product areas, resources, tools, and structured content.',
    references: navigationmenuReferences,
  },
  {
    id: 'menubar-family',
    title: 'Menubar family',
    description: 'Desktop-style command menus with submenus, checkboxes, radio choices, icons, and labels.',
    references: menubarReferences,
  },
  {
    id: 'avatar-family',
    title: 'Avatar family',
    description: 'Identity, fallbacks, statuses, verification, groups, counts, and people-oriented actions.',
    references: avatarReferences,
  },
]

export default function NavigationIdentityDesignSystemPage() {
  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1700px] px-6 py-12 lg:px-10'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · premium review
          </p>
          <h1 className='mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'>
            Navigation should orient; identity should clarify.
          </h1>
          <p className='mt-5 text-base leading-7 text-muted-foreground'>
            All 9 premium Navigation Menu, 8 premium Menubar, and 20 premium Avatar references are
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

        <section className='mt-16 rounded-3xl border bg-muted/20 p-6 lg:p-8' aria-labelledby='navigation-identity-rules'>
          <div className='max-w-3xl'>
            <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>
              Local contract
            </p>
            <h2 id='navigation-identity-rules' className='mt-3 text-2xl font-semibold tracking-tight'>
              Missa navigation and identity rules
            </h2>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              These premium references give us range. Before product adoption, we will lock down
              information hierarchy, route semantics, mobile behavior, keyboard interaction, identity
              provenance, and status meaning as one coherent contract.
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

