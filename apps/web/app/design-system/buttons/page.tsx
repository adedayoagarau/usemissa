import { ArrowRight, Check, LoaderCircle, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Button family · Missa design review',
  robots: { index: false, follow: false },
}

const roles = [
  {
    title: 'Primary action',
    description: 'The one clear next step on a surface.',
    content: <Button>Explore opportunities</Button>,
  },
  {
    title: 'Secondary action',
    description: 'A useful alternative that should not compete with the primary action.',
    content: <Button variant="outline">Build your profile</Button>,
  },
  {
    title: 'Icon action',
    description: 'For compact, familiar actions with an accessible name.',
    content: (
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" aria-label="Mark as complete" title="Mark as complete">
          <Check />
        </Button>
        <Button size="icon" variant="outline" aria-label="More actions" title="More actions">
          <MoreHorizontal />
        </Button>
      </div>
    ),
  },
  {
    title: 'Destructive action',
    description: 'Reserved for deletion, irreversible changes, or genuine failure recovery.',
    content: (
      <Button variant="destructive">
        <Trash2 />
        Delete
      </Button>
    ),
  },
  {
    title: 'Marketing moment',
    description: 'The premium shine treatment is opt-in and does not belong in organization chrome.',
    content: (
      <Button variant="shine">
        See what fits
        <ArrowRight />
      </Button>
    ),
  },
]

export default function ButtonDesignReviewPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Missa design review · Button family</p>
        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-4xl font-medium tracking-tight sm:text-5xl">Actions should feel clear before they feel clever.</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">A first pass at the shared Button family: calm enough for creator and organization flows, with one expressive treatment reserved for marketing.</p>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-2" aria-label="Button roles">
          {roles.map((role) => (
            <article key={role.title} className="flex min-h-44 flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(28,24,21,0.05)]">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{role.title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{role.description}</p>
              </div>
              <div className="mt-8">{role.content}</div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-card p-6" aria-labelledby="sizes-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="sizes-heading" className="text-lg font-semibold tracking-tight">Density and states</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Default controls target the 44px touch rhythm; compact controls target the 36px organization rhythm.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">44px · 36px · 32px</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg">Default</Button>
            <Button size="sm" variant="outline">Compact</Button>
            <Button size="xs" variant="ghost">Extra small</Button>
            <Button disabled>Disabled</Button>
            <Button disabled>
              <LoaderCircle className="animate-spin" />
              Saving…
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
