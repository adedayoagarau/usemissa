'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Image from 'next/image'
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Opportunity = {
  id: string
  title: string
  organization: string
  category: 'Grant' | 'Residency'
  deadline: string
  fee: string
  fit: 'Good fit' | 'Possible fit'
  location: string
  saved: boolean
  imageSrc: string
  imageAlt: string
}

const initialOpportunities: Opportunity[] = [
  {
    id: 'lagos-contemporary-practice-grant',
    title: 'Lagos Contemporary Practice Grant',
    organization: 'Centre for Contemporary Art, Lagos',
    category: 'Grant',
    deadline: '18 Sep 2026',
    fee: 'No fee',
    fit: 'Good fit',
    location: 'Nigeria · Remote eligible',
    saved: true,
    imageSrc: '/media/home/opportunity-architecture.webp',
    imageAlt: 'Light-filled contemporary arts building under a blue sky',
  },
  {
    id: 'new-voices-residency',
    title: 'New Voices Residency',
    organization: 'Kunsthalle Exchange',
    category: 'Residency',
    deadline: '02 Oct 2026',
    fee: '$15 application fee',
    fit: 'Possible fit',
    location: 'Accra · In person',
    saved: false,
    imageSrc: '/media/home/opportunity-dance.webp',
    imageAlt: 'Dancer performing against a dark stage',
  },
]

const categories = ['all', 'Grant', 'Residency'] as const
type CategoryFilter = (typeof categories)[number]

function SourceStatus() {
  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-mineral-blue/20 bg-mineral-blue-tint px-3 py-2 text-xs text-mineral-blue'>
      <span className='inline-flex items-center gap-1.5 font-medium'>
        <CheckCircle2 className='size-3.5' aria-hidden='true' />
        Official organization page
      </span>
      <span className='text-mineral-blue/70'>Source link available</span>
      <Button
        nativeButton={false}
        render={<a href='#review-contract' />}
        variant='link'
        size='xs'
        className='h-auto p-0 text-mineral-blue'
      >
        View source
        <ArrowUpRight aria-hidden='true' />
      </Button>
    </div>
  )
}

function OpportunityFacts({ compact = false }: { compact?: boolean }) {
  const facts = [
    { label: 'Deadline', value: '18 Sep 2026', detail: '42 days left', icon: CalendarDays, attention: true },
    { label: 'Application fee', value: 'No fee', detail: 'Confirmed by source', icon: Tag },
    { label: 'Location', value: 'Nigeria', detail: 'Remote eligible', icon: MapPin },
    { label: 'Materials', value: 'Work sample + bio', detail: '2 requirements', icon: FileText },
  ]

  return (
    <div className={compact ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2'}>
      {facts.map(({ label, value, detail, icon: Icon, attention }) => (
        <div key={label} className='rounded-lg border border-border bg-background p-3'>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Icon className={attention ? 'size-3.5 text-ochre-deep' : 'size-3.5'} aria-hidden='true' />
            {label}
          </div>
          <p className='mt-2 font-medium text-foreground'>{value}</p>
          <p className={attention ? 'mt-1 text-xs text-ochre-deep' : 'mt-1 text-xs text-muted-foreground'}>{detail}</p>
        </div>
      ))}
    </div>
  )
}

function FitExplanation() {
  return (
    <Card variant='muted' size='sm'>
      <CardHeader>
        <div className='flex items-start gap-3'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-deep'>
            <Sparkles className='size-4' aria-hidden='true' />
          </div>
          <div>
            <CardTitle>Why this may fit</CardTitle>
            <CardDescription className='mt-1'>Based on your Profile</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-2 text-sm leading-6 text-muted-foreground'>
        <p><span className='font-medium text-foreground'>Your field:</span> poetry and visual writing.</p>
        <p><span className='font-medium text-foreground'>Their requirement:</span> short-form literary work.</p>
        <p className='border-l-2 border-ochre pl-3 text-ochre-deep'>Confirm the location requirement before preparing your work.</p>
      </CardContent>
    </Card>
  )
}

function PrepareChecklist() {
  const items = [
    ['Writing sample', true],
    ['Short biography', true],
    ['Confirm location eligibility', false],
  ] as const

  return (
    <Card id='prepare-checklist' size='sm'>
      <CardHeader>
        <CardTitle>Prepare</CardTitle>
        <CardDescription>Check each requirement before you submit.</CardDescription>
        <CardAction>
          <Badge variant='outline' className='border-green/20 bg-lichen-tint text-green'>2 of 3 ready</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Progress value={67} aria-label='Two of three requirements ready'>
          <ProgressLabel className='sr-only'>Application preparation</ProgressLabel>
          <ProgressValue className='sr-only'>{() => '2 of 3 ready'}</ProgressValue>
        </Progress>
        <ul className='space-y-2'>
          {items.map(([label, complete]) => (
            <li key={label} className='flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm'>
              <span className={complete ? 'flex size-5 items-center justify-center rounded-full bg-lichen-tint text-green' : 'flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground'}>
                {complete ? <Check className='size-3.5' aria-hidden='true' /> : <span className='size-1.5 rounded-full bg-border' aria-hidden='true' />}
              </span>
              <span className={complete ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className='justify-end'>
        <Button nativeButton={false} render={<a href='#prepare-checklist' />} size='sm' variant='outline'>
          Review checklist
        </Button>
      </CardFooter>
    </Card>
  )
}

function DetailContent() {
  return (
    <div className='space-y-5'>
      <SourceStatus />
      <OpportunityFacts compact />
      <Separator />
      <FitExplanation />
      <PrepareChecklist />
    </div>
  )
}

function OpportunityCardPreview({
  opportunity,
  selected,
  onOpen,
  onToggleSaved,
}: {
  opportunity: Opportunity
  selected: boolean
  onOpen: () => void
  onToggleSaved: () => void
}) {
  return (
    <Card variant={selected ? 'selected' : 'interactive'} size='lg'>
      <CardHeader className='border-b border-border p-0'>
        <div className='relative aspect-[16/7] overflow-hidden'>
          <Image src={opportunity.imageSrc} alt={opportunity.imageAlt} fill sizes='(min-width: 1024px) 50vw, 100vw' className='object-cover' />
          <div className='absolute inset-x-3 top-3 flex items-start justify-between gap-3'>
            <Badge variant='secondary' className='border border-white/40 bg-white/90 text-foreground'>{opportunity.category}</Badge>
            <Button
              type='button'
              variant={opportunity.saved ? 'secondary' : 'ghost'}
              size='icon-sm'
              className='bg-white/90 text-foreground backdrop-blur-sm hover:bg-white'
              aria-label={opportunity.saved ? `Remove ${opportunity.title} from saved opportunities` : `Save ${opportunity.title}`}
              aria-pressed={opportunity.saved}
              onClick={onToggleSaved}
            >
              <Bookmark className={opportunity.saved ? 'fill-current text-primary' : ''} aria-hidden='true' />
            </Button>
          </div>
        </div>
        <div className='px-(--card-spacing) pt-(--card-spacing)'>
          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className={opportunity.fit === 'Good fit' ? 'border-green/20 bg-lichen-tint text-green' : 'border-ochre/20 bg-ochre-tint text-ochre-deep'}
            >
              {opportunity.fit}
            </Badge>
          </div>
          <CardTitle className='mt-3 text-xl leading-tight'>{opportunity.title}</CardTitle>
          <CardDescription>{opportunity.organization}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground'>
          <span className='inline-flex items-center gap-1.5'>
            <CalendarDays className='size-3.5 text-ochre-deep' aria-hidden='true' />
            <span className='font-mono tabular-nums'>{opportunity.deadline}</span>
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <Tag className='size-3.5' aria-hidden='true' />
            {opportunity.fee}
          </span>
        </div>
        <p className='inline-flex items-center gap-1.5 text-sm text-muted-foreground'>
          <MapPin className='size-4' aria-hidden='true' />
          {opportunity.location}
        </p>
      </CardContent>
      <CardFooter className='justify-between gap-3'>
        <span className='text-xs text-muted-foreground'>{opportunity.saved ? 'Saved today' : 'Updated yesterday'}</span>
        <Button type='button' size='sm' variant={selected ? 'default' : 'outline'} onClick={onOpen}>
          View opportunity
          <ArrowUpRight aria-hidden='true' />
        </Button>
      </CardFooter>
    </Card>
  )
}

function DesktopDetailPanel({ opportunity, tracked, onTrack }: { opportunity: Opportunity; tracked: boolean; onTrack: () => void }) {
  return (
    <Card size='lg' className='h-fit lg:sticky lg:top-6'>
      <CardHeader>
        <div className='relative aspect-[16/8] overflow-hidden rounded-lg border border-border bg-muted'>
          <Image src={opportunity.imageSrc} alt={opportunity.imageAlt} fill sizes='(min-width: 1024px) 40vw, 100vw' className='object-cover' />
        </div>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='secondary'>{opportunity.category}</Badge>
            <Badge variant='outline' className='border-green/20 bg-lichen-tint text-green'>Open</Badge>
          </div>
          <Button type='button' variant={opportunity.saved ? 'secondary' : 'outline'} size='icon-sm' aria-label={opportunity.saved ? 'Saved opportunity' : 'Save opportunity'} aria-pressed={opportunity.saved}>
            <Bookmark className={opportunity.saved ? 'fill-current text-primary' : ''} aria-hidden='true' />
          </Button>
        </div>
        <CardTitle className='mt-3 text-2xl leading-tight'>{opportunity.title}</CardTitle>
        <CardDescription>{opportunity.organization} · Nigeria</CardDescription>
      </CardHeader>
      <CardContent>
        <DetailContent />
      </CardContent>
      <CardFooter className='flex-col items-stretch gap-2 sm:flex-row sm:justify-between'>
        <Button type='button' variant='outline' onClick={onTrack}>{tracked ? 'Tracked' : 'Track submission'}</Button>
        <Button type='button'>Prepare application <ArrowUpRight aria-hidden='true' /></Button>
      </CardFooter>
    </Card>
  )
}

export function ProfileOpportunityJourneyPreview() {
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [selectedId, setSelectedId] = useState(initialOpportunities[0].id)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [noFeeOnly, setNoFeeOnly] = useState(false)
  const [tracked, setTracked] = useState(false)

  const selected = opportunities.find((opportunity) => opportunity.id === selectedId) ?? opportunities[0]
  const filteredOpportunities = useMemo(() => opportunities.filter((opportunity) => {
    const matchesQuery = submittedQuery.length === 0 || `${opportunity.title} ${opportunity.organization}`.toLowerCase().includes(submittedQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || opportunity.category === selectedCategory
    const matchesFee = !noFeeOnly || opportunity.fee === 'No fee'
    return matchesQuery && matchesCategory && matchesFee
  }), [noFeeOnly, opportunities, selectedCategory, submittedQuery])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedQuery(query.trim())
  }

  function selectOpportunity(opportunity: Opportunity, openMobile = false) {
    setSelectedId(opportunity.id)
    setMobileDetailOpen(openMobile)
  }

  function clearFilters() {
    setQuery('')
    setSubmittedQuery('')
    setSelectedCategory('all')
    setNoFeeOnly(false)
  }

  return (
    <main className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12'>
        <header className='max-w-4xl'>
          <p className='text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Missa component library · Profile journey review
          </p>
          <h1 className='mt-4 max-w-3xl font-heading text-4xl font-semibold tracking-tight sm:text-5xl'>
            A useful opportunity surface should answer the next question.
          </h1>
          <p className='mt-5 max-w-3xl text-base leading-7 text-muted-foreground'>
            This local composition assembles the approved premium foundation into the first Profile journey: browse, inspect evidence, understand fit, and prepare. It is a review surface only; nothing here is connected to product data or production routes.
          </p>
        </header>

        <section className='mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,0.95fr)] lg:items-start'>
          <div className='space-y-5'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <p className='text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground'>Opportunities</p>
                <h2 className='mt-1 text-2xl font-semibold tracking-tight'>Find a call that fits your work.</h2>
              </div>
              <Badge variant='outline'>{filteredOpportunities.length} opportunities in review</Badge>
            </div>

            <div className='rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(28,24,21,0.05)]'>
              <form className='flex flex-col gap-3 sm:flex-row' role='search' onSubmit={submitSearch}>
                <label className='relative flex-1'>
                  <span className='sr-only'>Search opportunities</span>
                  <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden='true' />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className='h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50' placeholder='Search opportunities' />
                </label>
                <Popover>
                  <PopoverTrigger render={<Button type='button' variant='outline' />}>
                    <SlidersHorizontal aria-hidden='true' />
                    Filters
                    {Number(noFeeOnly) > 0 && <Badge variant='secondary' className='px-1.5'>1</Badge>}
                  </PopoverTrigger>
                  <PopoverContent align='end' className='w-[min(20rem,calc(100vw-2rem))] p-4'>
                    <PopoverHeader>
                      <PopoverTitle>Filter opportunities</PopoverTitle>
                      <PopoverDescription>Keep practical requirements visible.</PopoverDescription>
                    </PopoverHeader>
                    <div className='mt-3 space-y-3'>
                      <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm'>
                        <input type='checkbox' checked={noFeeOnly} onChange={(event) => setNoFeeOnly(event.target.checked)} className='mt-0.5 size-4 accent-[var(--primary)]' />
                        <span><span className='block font-medium'>No fee</span><span className='mt-0.5 block text-xs text-muted-foreground'>Keep application cost explicit.</span></span>
                      </label>
                    </div>
                  </PopoverContent>
                </Popover>
              </form>
              <div className='mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between'>
                <ToggleGroup value={[selectedCategory]} onValueChange={(value) => setSelectedCategory((value[0] as CategoryFilter | undefined) ?? 'all')} variant='outline' size='sm' spacing={0} aria-label='Opportunity type'>
                  {categories.map((category) => <ToggleGroupItem key={category} value={category}>{category === 'all' ? 'All' : `${category}s`}</ToggleGroupItem>)}
                </ToggleGroup>
                <div className='flex flex-wrap items-center gap-2'>
                  {submittedQuery && <Badge variant='secondary'>Search: {submittedQuery}</Badge>}
                  {noFeeOnly && <Badge variant='secondary'>No fee</Badge>}
                  {(submittedQuery || selectedCategory !== 'all' || noFeeOnly) && <Button type='button' variant='ghost' size='xs' className='text-muted-foreground' onClick={clearFilters}>Clear all</Button>}
                </div>
              </div>
            </div>

            <div className='grid gap-4'>
              {filteredOpportunities.length > 0 ? filteredOpportunities.map((opportunity) => (
                <OpportunityCardPreview
                  key={opportunity.id}
                  opportunity={opportunity}
                  selected={selected.id === opportunity.id}
                  onOpen={() => selectOpportunity(opportunity, true)}
                  onToggleSaved={() => setOpportunities((current) => current.map((item) => item.id === opportunity.id ? { ...item, saved: !item.saved } : item))}
                />
              )) : (
                <Card size='lg' className='items-center px-6 py-16 text-center'>
                  <Sparkles className='size-5 text-primary' aria-hidden='true' />
                  <CardTitle className='mt-3'>No opportunities match.</CardTitle>
                  <CardDescription className='mt-1 max-w-sm'>Try a broader search or clear a filter.</CardDescription>
                  <Button type='button' variant='outline' className='mt-5' onClick={clearFilters}>Clear filters</Button>
                </Card>
              )}
            </div>
          </div>

          <div>
            <div className='mb-3 flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground'>Selected opportunity</p>
                <p className='mt-1 text-sm text-muted-foreground'>Detail panel on desktop · sheet on mobile</p>
              </div>
              <div className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
                <Clock3 className='size-3.5' aria-hidden='true' />
                State first
              </div>
            </div>
            <div className='hidden lg:block'>
              <DesktopDetailPanel opportunity={selected} tracked={tracked} onTrack={() => setTracked((value) => !value)} />
            </div>
            <div className='lg:hidden'>
              <Card variant='selected' size='sm'>
                <div className='relative aspect-[16/8] overflow-hidden rounded-t-xl'>
                  <Image src={selected.imageSrc} alt={selected.imageAlt} fill sizes='100vw' className='object-cover' />
                </div>
                <CardHeader>
                  <CardTitle>{selected.title}</CardTitle>
                  <CardDescription>{selected.organization}</CardDescription>
                </CardHeader>
                <CardContent className='text-sm text-muted-foreground'>
                  <SourceStatus />
                </CardContent>
                <CardFooter>
                  <Button type='button' className='w-full' onClick={() => setMobileDetailOpen(true)}>Open opportunity details <ArrowUpRight aria-hidden='true' /></Button>
                </CardFooter>
              </Card>
              <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
                <SheetContent side='bottom' className='max-h-[90vh] overflow-y-auto rounded-t-2xl p-0'>
                  <SheetHeader className='border-b border-border px-5 py-5 pr-14 text-left'>
                    <SheetTitle className='text-xl'>{selected.title}</SheetTitle>
                    <SheetDescription>{selected.organization} · Opportunity details</SheetDescription>
                  </SheetHeader>
                  <div className='p-5'><DetailContent /></div>
                  <SheetFooter className='border-t border-border bg-muted/50 px-5 py-4 sm:flex-row'>
                    <Button type='button' variant='outline' onClick={() => setTracked((value) => !value)}>{tracked ? 'Tracked' : 'Track submission'}</Button>
                    <Button type='button'>Prepare application <ArrowUpRight aria-hidden='true' /></Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </section>

        <section id='review-contract' className='mt-16 rounded-3xl border border-border bg-card p-6 lg:p-8' aria-labelledby='contract-heading'>
          <p className='text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground'>Local contract</p>
          <h2 id='contract-heading' className='mt-3 text-2xl font-semibold tracking-tight'>Profile components must make evidence and action legible.</h2>
          <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {[
              ['One dominant action', 'Aubergine is reserved for the next meaningful action.'],
              ['Source link is clear', 'Give users a path to the official source when a decision depends on it.'],
              ['Fit is explained', 'Show the Profile detail and requirement that shaped the recommendation.'],
              ['Mobile keeps the path', 'Move detail into a sheet and preserve the next action at the bottom.'],
            ].map(([title, description]) => (
              <div key={title} className='rounded-2xl border border-border bg-background p-5'>
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
