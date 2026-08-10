import { ArrowUpRight, Bookmark, CalendarDays, CheckCircle2, FileCheck2, Tag, TriangleAlert } from 'lucide-react'
import type { Metadata } from 'next'

import PremiumCard01 from '@/components/shadcn-studio/card/card-01'
import PremiumCard02 from '@/components/shadcn-studio/card/card-02'
import PremiumCard03 from '@/components/shadcn-studio/card/card-03'
import PremiumCard04 from '@/components/shadcn-studio/card/card-04'
import PremiumCard05 from '@/components/shadcn-studio/card/card-05'
import PremiumCard06 from '@/components/shadcn-studio/card/card-06'
import PremiumCard07 from '@/components/shadcn-studio/card/card-07'
import PremiumCard08 from '@/components/shadcn-studio/card/card-08'
import PremiumCard09 from '@/components/shadcn-studio/card/card-09'
import PremiumCard10 from '@/components/shadcn-studio/card/card-10'
import PremiumCard11 from '@/components/shadcn-studio/card/card-11'
import PremiumCard12 from '@/components/shadcn-studio/card/card-12'
import PremiumCard13 from '@/components/shadcn-studio/card/card-13'
import PremiumCard14 from '@/components/shadcn-studio/card/card-14'
import PremiumCard15 from '@/components/shadcn-studio/card/card-15'
import PremiumCard16 from '@/components/shadcn-studio/card/card-16'
import PremiumCard17 from '@/components/shadcn-studio/card/card-17'
import { ReviewReferenceGrid, type ReviewReference } from '@/components/shadcn-studio/review-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Card family · Missa design review',
  robots: { index: false, follow: false },
}

const facts = [
  { label: 'Deadline', value: '18 Sep 2026', detail: '42 days left', icon: CalendarDays },
  { label: 'Application fee', value: 'No fee', detail: 'Confirmed by source', icon: Tag },
]

const premiumCardReferences: ReviewReference[] = [
  { id: '01', label: 'Form / authentication', note: 'Task surface', Component: PremiumCard01 },
  { id: '02', label: 'Meeting notes', note: 'Content + actions', Component: PremiumCard02 },
  { id: '03', label: 'Invite / participant', note: 'Identity + actions', Component: PremiumCard03 },
  { id: '04', label: 'Media / bottom image', note: 'Editorial media', Component: PremiumCard04 },
  { id: '05', label: 'Media / top image', note: 'Editorial media', Component: PremiumCard05 },
  { id: '06', label: 'Media / horizontal', note: 'Catalogue anatomy', Component: PremiumCard06 },
  { id: '07', label: 'Media / overlay', note: 'Marketing only', Component: PremiumCard07 },
  { id: '08', label: 'Soft surface', note: 'Decorative surface', Component: PremiumCard08 },
  { id: '09', label: 'Outline surface', note: 'Quiet surface', Component: PremiumCard09 },
  { id: '10', label: 'Tabbed card', note: 'Dense subcontent', Component: PremiumCard10 },
  { id: '11', label: 'Social post', note: 'Content object', Component: PremiumCard11 },
  { id: '12', label: 'Product card', note: 'Commerce anatomy', Component: PremiumCard12 },
  { id: '13', label: 'Testimonial', note: 'Marketing proof', Component: PremiumCard13 },
  { id: '14', label: 'Call to action', note: 'Marketing only', Component: PremiumCard14 },
  { id: '15', label: 'Media group', note: 'Collection anatomy', Component: PremiumCard15 },
  { id: '16', label: 'Spotlight hover', note: 'Reject for product', Component: PremiumCard16 },
  { id: '17', label: '3D hover', note: 'Reject for product', Component: PremiumCard17 },
]

function OpportunityCardPreview() {
  return (
    <Card size="lg" className="h-full">
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Open call</Badge>
          <Badge variant="secondary">Good fit</Badge>
        </div>
        <CardTitle className="mt-2 text-xl">Lagos Contemporary Practice Grant</CardTitle>
        <CardDescription>Centre for Contemporary Art, Lagos · Nigeria</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {facts.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </div>
            <p className="mt-2 font-medium text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end gap-3">
        <Button size="sm">
          View opportunity
          <ArrowUpRight />
        </Button>
      </CardFooter>
    </Card>
  )
}

function SubmissionCardPreview() {
  return (
    <Card size="sm" variant="interactive" className="h-full w-full max-w-sm lg:mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Open call submission</CardTitle>
            <CardDescription className="mt-1">Centre for Contemporary Art, Lagos</CardDescription>
          </div>
          <Badge variant="secondary">In review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileCheck2 className="size-4 text-green" aria-hidden="true" />
          <span>3 of 4 requirements ready</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label="75 percent ready">
          <div className="h-full w-3/4 rounded-full bg-green" />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-3">
        <Button size="sm" variant="outline">Continue</Button>
      </CardFooter>
    </Card>
  )
}

function SavedOpportunityCardPreview() {
  return (
    <Card size="sm" variant="interactive" className="h-full w-full max-w-sm lg:mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Saved opportunity</CardTitle>
            <CardDescription className="mt-1">Keep a promising call close while you prepare.</CardDescription>
          </div>
          <Bookmark className="size-4 text-accent-deep" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">Lagos Contemporary Practice Grant</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Deadline 18 Sep 2026
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span className="text-xs text-muted-foreground">Saved today</span>
        <Button size="sm" variant="outline">Open</Button>
      </CardFooter>
    </Card>
  )
}

function OrganizationMetricPreview({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return (
    <Card size="sm" variant={warning ? 'danger' : 'default'}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm">{label}</CardTitle>
          {warning ? <TriangleAlert className="size-4 text-destructive" aria-hidden="true" /> : <CheckCircle2 className="size-4 text-green" aria-hidden="true" />}
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl tabular-nums">{value}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

export default function CardDesignReviewPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Missa design review · Card family</p>
        <div className="mt-4 max-w-3xl">
          <h1 className="font-heading text-4xl font-medium tracking-tight sm:text-5xl">Cards should make evidence easier to act on.</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">This review separates the shared surface rules from product-specific card anatomy: opportunity decisions, submissions, evidence, and organization summaries.</p>
        </div>

        <section className="mt-12" aria-labelledby="states-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="states-heading" className="text-lg font-semibold tracking-tight">Shared surface states</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Default is quiet. Interactive and selected states are explicit. Attention is semantic, not decorative.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">border · focus · hover · selected</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader><CardTitle>Default</CardTitle><CardDescription>For grouped content and summaries.</CardDescription></CardHeader>
              <CardContent><p className="text-sm leading-6 text-muted-foreground">True white, hairline border, restrained shadow.</p></CardContent>
            </Card>
            <Card variant="interactive">
              <CardHeader><CardTitle>Interactive</CardTitle><CardDescription>For a card with a clear next action.</CardDescription></CardHeader>
              <CardContent><a href="#product-patterns" className="inline-flex items-center gap-2 text-sm font-medium text-accent-deep underline underline-offset-4">See an example <ArrowUpRight className="size-4" /></a></CardContent>
            </Card>
            <Card variant="selected">
              <CardHeader><CardTitle>Selected</CardTitle><CardDescription>For comparison, save, or active detail.</CardDescription></CardHeader>
              <CardContent><div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4 text-green" /> Active opportunity</div></CardContent>
            </Card>
            <Card variant="danger">
              <CardHeader><CardTitle>Attention</CardTitle><CardDescription>For a genuine warning or blocked state.</CardDescription></CardHeader>
              <CardContent><p className="text-sm leading-6 text-muted-foreground">A required field needs a decision before this can be published.</p></CardContent>
            </Card>
          </div>
        </section>

        <section id="product-patterns" className="mt-12" aria-labelledby="patterns-heading">
          <div>
            <h2 id="patterns-heading" className="text-lg font-semibold tracking-tight">Missa product patterns</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">These are the three patterns we should standardize before touching every screen.</p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,22rem)_minmax(18rem,22rem)]">
            <OpportunityCardPreview />
            <SubmissionCardPreview />
            <SavedOpportunityCardPreview />
          </div>
        </section>

        <section className="mt-12" aria-labelledby="organization-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="organization-heading" className="text-lg font-semibold tracking-tight">Organization starts here</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Organization cards should be compact summaries and queues. Tables remain the home for assignments, submissions, and genuinely tabular data.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">compact · operational · scannable</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OrganizationMetricPreview label="Open calls" value="28" detail="9 published · 4 closing soon" />
            <OrganizationMetricPreview label="Needs attention" value="6" detail="Reviews with an unresolved decision" warning />
            <OrganizationMetricPreview label="Submissions" value="42" detail="12 awaiting reviewer assignment" />
          </div>
        </section>

        <section className="mt-12" aria-labelledby="density-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="density-heading" className="text-lg font-semibold tracking-tight">Density levels</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Use compact cards for organization queues, default for mixed surfaces, and spacious cards for creator decisions.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">12px · 16px · 24px</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(['sm', 'default', 'lg'] as const).map((size) => (
              <Card key={size} size={size}>
                <CardHeader><CardTitle>{size === 'sm' ? 'Organization compact' : size === 'lg' ? 'Creator spacious' : 'Shared default'}</CardTitle><CardDescription>Card padding rhythm</CardDescription></CardHeader>
                <CardContent><p className="text-sm leading-6 text-muted-foreground">Use the smallest level that still keeps the content legible and actionable.</p></CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-border pt-12" aria-labelledby="premium-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 id="premium-heading" className="text-lg font-semibold tracking-tight">Premium references installed</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">These Shadcn Studio examples are available locally for comparison. They are reference material, not automatic product defaults.</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">17 premium variants · complete installed set</span>
          </div>
          <div className="mt-6">
            <ReviewReferenceGrid references={premiumCardReferences} />
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-border bg-card p-6" aria-labelledby="rules-heading">
          <CardHeader className="px-0">
            <CardTitle id="rules-heading">Promotion rules</CardTitle>
            <CardDescription>What we should agree before applying this family across the product.</CardDescription>
            <CardAction><Badge variant="outline">Review gate</Badge></CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
              <li>One dominant fact or action per card.</li>
              <li>Keep the official source and decisive eligibility facts close.</li>
              <li>Do not use cards where a table or labelled list is clearer.</li>
              <li>Every interactive card still needs a real link, button, or control.</li>
            </ul>
          </CardContent>
        </section>
      </div>
    </main>
  )
}
