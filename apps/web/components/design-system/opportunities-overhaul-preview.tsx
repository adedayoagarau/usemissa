'use client'

import Image from 'next/image'
import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  Filter,
  Flag,
  Globe2,
  MapPin,
  Menu,
  Search,
  Tag,
  X,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import styles from './opportunities-overhaul-preview.module.css'

type OpportunityType = 'Open call' | 'Residency' | 'Award' | 'Grant'
type ReviewState = 'default' | 'loading' | 'empty' | 'error'

type Opportunity = {
  id: string
  title: string
  organization: string | null
  type: OpportunityType
  practices: string[]
  deadline: string
  deadlineKind: 'exact' | 'rolling' | 'unknown'
  fee: string
  reach: string
  imageSrc?: string
  imageAlt?: string
  summary: string
  eligibility: string[]
  preparation: string[]
  sourceUrl?: string
}

type Filters = {
  types: OpportunityType[]
  practices: string[]
  reach: 'Anywhere' | 'Online' | 'Nigeria' | 'In person'
  deadline: 'Any time' | 'Next 30 days' | 'Rolling' | 'Deadline not listed'
  fee: 'Any fee' | 'No fee' | 'Fee listed' | 'Fee not listed'
}

const emptyFilters: Filters = {
  types: [],
  practices: [],
  reach: 'Anywhere',
  deadline: 'Any time',
  fee: 'Any fee',
}

const initialFilters: Filters = {
  ...emptyFilters,
  practices: ['Poetry', 'Fiction'],
}

const opportunities: Opportunity[] = [
  {
    id: 'north-river-review',
    title: 'North River Review — Call for Submissions',
    organization: 'North River Review',
    type: 'Open call',
    practices: ['Poetry', 'Fiction'],
    deadline: '14 Aug 2026',
    deadlineKind: 'exact',
    fee: 'No fee',
    reach: 'Online',
    summary: 'A literary magazine call for poetry and short fiction. Review the requirements before choosing work to prepare.',
    eligibility: ['Open to writers worldwide', 'Simultaneous submissions allowed'],
    preparation: ['Short biography', 'Cover letter', 'Writing sample'],
  },
  {
    id: 'woodstock-film-festival',
    title: 'Woodstock Film Festival',
    organization: 'Woodstock Film Festival',
    type: 'Award',
    practices: ['Film'],
    deadline: '28 Aug 2026',
    deadlineKind: 'exact',
    fee: 'Fee not listed',
    reach: 'Woodstock, NY + Online',
    imageSrc: '/media/home/opportunity-dance.webp',
    imageAlt: 'Performer lit against a dark stage',
    summary: 'A film programme with online entry and an in-person festival. Confirm the current category and fee before submitting.',
    eligibility: ['Film and moving-image work', 'International entries considered'],
    preparation: ['Film link', 'Project synopsis', 'Creator biography'],
    sourceUrl: 'https://woodstockfilmfestival.org/',
  },
  {
    id: 'gallery-childrens-biennale',
    title: "Gallery Children's Biennale 2025: Tomorrow We'll Be…",
    organization: "Gallery Children's Biennale",
    type: 'Open call',
    practices: ['Visual art', 'Education'],
    deadline: '15 Sep 2026',
    deadlineKind: 'exact',
    fee: 'Fee not listed',
    reach: 'Brooklyn, NY',
    imageSrc: '/media/missa-org-gallery.png',
    imageAlt: 'Visitors viewing artwork in a bright gallery',
    summary: 'An exhibition opportunity centred on new work for young audiences and public learning.',
    eligibility: ['Artists and collectives', 'Work suitable for public exhibition'],
    preparation: ['Project proposal', 'Work samples', 'Installation requirements'],
  },
  {
    id: 'compass-literary-awards',
    title: 'Compass Literary Awards',
    organization: null,
    type: 'Award',
    practices: ['Poetry', 'Fiction'],
    deadline: 'Rolling',
    deadlineKind: 'rolling',
    fee: '$25',
    reach: 'International',
    imageSrc: '/media/home/portfolio-still-life.webp',
    imageAlt: 'Still life with books and sculptural objects',
    summary: 'A recurring literary award. The publishing organization is not confirmed, so read the official guidelines carefully.',
    eligibility: ['Eligibility varies by category'],
    preparation: ['Writing sample', 'Category selection'],
  },
  {
    id: 'flanders-arts-institute',
    title: 'Flanders Arts Institute Residency',
    organization: 'Flanders Arts Institute',
    type: 'Residency',
    practices: ['Visual art', 'Research'],
    deadline: '10 Oct 2026',
    deadlineKind: 'exact',
    fee: 'Fee unclear',
    reach: 'Brussels, Belgium',
    imageSrc: '/media/home/gallery-interior.webp',
    imageAlt: 'Contemporary gallery interior with visitors',
    summary: 'A research-led residency for artists developing a new body of work in dialogue with local institutions.',
    eligibility: ['International artists', 'Travel required'],
    preparation: ['Project statement', 'Portfolio', 'Availability'],
  },
  {
    id: 'lagos-contemporary-practice-grant',
    title: 'Lagos Contemporary Practice Grant',
    organization: 'Centre for Contemporary Art, Lagos',
    type: 'Grant',
    practices: ['Visual art', 'Photography'],
    deadline: '18 Sep 2026',
    deadlineKind: 'exact',
    fee: 'No fee',
    reach: 'Nigeria · Remote eligible',
    imageSrc: '/media/home/opportunity-architecture.webp',
    imageAlt: 'Contemporary arts building under a clear sky',
    summary: 'A project grant for contemporary practitioners based in Nigeria, with remote participation for selected activities.',
    eligibility: ['Nigeria-based practitioners', 'Independent and collective applications'],
    preparation: ['Project budget', 'Portfolio', 'Short biography'],
    sourceUrl: 'https://ccalagos.org/',
  },
  {
    id: 'new-voices-residency',
    title: 'New Voices Residency',
    organization: 'Kunsthalle Exchange',
    type: 'Residency',
    practices: ['Writing', 'Performance'],
    deadline: 'Deadline not listed',
    deadlineKind: 'unknown',
    fee: '$15 application fee',
    reach: 'Accra · In person',
    imageSrc: '/media/home/opportunity-mountains.webp',
    imageAlt: 'Mountain landscape seen across a wide valley',
    summary: 'An in-person residency for emerging writers and performers. The deadline is not stated in the available call information.',
    eligibility: ['Emerging practitioners', 'In-person attendance required'],
    preparation: ['Work sample', 'Statement of intent'],
  },
  {
    id: 'long-title-edge-case',
    title: 'International Open Call for Interdisciplinary Artists Working Across Sound, Moving Image, Performance and Public Space',
    organization: null,
    type: 'Open call',
    practices: ['Sound', 'Film', 'Performance'],
    deadline: '30 Nov 2026',
    deadlineKind: 'exact',
    fee: 'Fee not listed',
    reach: 'Eligibility not listed',
    summary: 'A deliberately long record used to test wrapping, missing organization details, and unknown eligibility without hiding uncertainty.',
    eligibility: ['Eligibility not listed'],
    preparation: ['Requirements not fully listed'],
  },
  {
    id: 'open-city-poetry-prize',
    title: 'Open City Poetry Prize',
    organization: 'Open City',
    type: 'Award',
    practices: ['Poetry'],
    deadline: '1 Dec 2026',
    deadlineKind: 'exact',
    fee: '$25',
    reach: 'International',
    summary: 'A poetry prize for unpublished work. Confirm the current word limit and publication terms before entering.',
    eligibility: ['Writers worldwide', 'Unpublished poems'],
    preparation: ['Poetry manuscript', 'Short biography'],
  },
  {
    id: 'pen-america-writing-for-change',
    title: 'PEN America Open Call — Writing for Change',
    organization: 'PEN America',
    type: 'Open call',
    practices: ['Fiction', 'Writing'],
    deadline: '31 Oct 2026',
    deadlineKind: 'exact',
    fee: 'No fee',
    reach: 'United States + Online',
    imageSrc: '/media/home/artist-at-work.webp',
    imageAlt: 'Artist working at a table in a bright studio',
    summary: 'A writing call focused on social change, public life, and narrative craft.',
    eligibility: ['Writers based in the United States', 'Online participation available'],
    preparation: ['Writing sample', 'Statement of interest'],
    sourceUrl: 'https://pen.org/',
  },
]

const practiceOptions = ['Poetry', 'Fiction', 'Film', 'Visual art', 'Photography', 'Writing', 'Performance', 'Sound']
const typeOptions: OpportunityType[] = ['Open call', 'Residency', 'Award', 'Grant']

function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function opportunityInitials(opportunity: Opportunity) {
  return (opportunity.organization ?? opportunity.title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

function activeFilterLabels(filters: Filters) {
  return [
    ...filters.types.map((value) => ({ key: `type:${value}`, label: value })),
    ...filters.practices.map((value) => ({ key: `practice:${value}`, label: value })),
    ...(filters.reach !== 'Anywhere' ? [{ key: 'reach', label: filters.reach }] : []),
    ...(filters.deadline !== 'Any time' ? [{ key: 'deadline', label: filters.deadline }] : []),
    ...(filters.fee !== 'Any fee' ? [{ key: 'fee', label: filters.fee }] : []),
  ]
}

function FilterPanel({
  value,
  onChange,
  onApply,
  onClear,
  compact = false,
}: {
  value: Filters
  onChange: (next: Filters) => void
  onApply: () => void
  onClear: () => void
  compact?: boolean
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [practiceQuery, setPracticeQuery] = useState('')
  const visiblePractices = practiceOptions.filter((practice) =>
    practice.toLowerCase().includes(practiceQuery.trim().toLowerCase()),
  )

  return (
    <form
      className={cn(styles.filterForm, compact && styles.filterFormCompact)}
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <div className={styles.filterHeadingRow}>
        <h2 className={styles.filterHeading}>Search filters</h2>
        <button type='button' className={styles.textButton} onClick={onClear}>Clear all</button>
      </div>

      <fieldset className={styles.filterGroup}>
        <legend>Opportunity type</legend>
        <div className={styles.checkboxList}>
          {typeOptions.map((type) => (
            <label key={type} className={styles.checkboxRow}>
              <Checkbox
                checked={value.types.includes(type)}
                onCheckedChange={() => onChange({ ...value, types: toggleArrayValue(value.types, type) })}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.filterGroup}>
        <legend>Practice</legend>
        <div className={styles.practiceSearch}>
          <Search aria-hidden='true' />
          <input
            aria-label='Search practices'
            placeholder='Search practices'
            value={practiceQuery}
            onChange={(event) => setPracticeQuery(event.target.value)}
          />
        </div>
        <div className={styles.checkboxList}>
          {visiblePractices.slice(0, moreOpen || practiceQuery ? visiblePractices.length : 4).map((practice) => (
            <label key={practice} className={styles.checkboxRow}>
              <Checkbox
                checked={value.practices.includes(practice)}
                onCheckedChange={() => onChange({ ...value, practices: toggleArrayValue(value.practices, practice) })}
              />
              <span>{practice}</span>
            </label>
          ))}
          {visiblePractices.length === 0 ? <p className={styles.noPracticeMatches}>No matching practices</p> : null}
        </div>
      </fieldset>

      <label className={styles.selectField}>
        <span>Location or eligibility reach</span>
        <select value={value.reach} onChange={(event) => onChange({ ...value, reach: event.target.value as Filters['reach'] })}>
          <option>Anywhere</option>
          <option>Online</option>
          <option>Nigeria</option>
          <option>In person</option>
        </select>
      </label>

      <label className={styles.selectField}>
        <span>Deadline</span>
        <select value={value.deadline} onChange={(event) => onChange({ ...value, deadline: event.target.value as Filters['deadline'] })}>
          <option>Any time</option>
          <option>Next 30 days</option>
          <option>Rolling</option>
          <option>Deadline not listed</option>
        </select>
      </label>

      <label className={styles.selectField}>
        <span>Fee</span>
        <select value={value.fee} onChange={(event) => onChange({ ...value, fee: event.target.value as Filters['fee'] })}>
          <option>Any fee</option>
          <option>No fee</option>
          <option>Fee listed</option>
          <option>Fee not listed</option>
        </select>
      </label>

      <Collapsible open={moreOpen} onOpenChange={setMoreOpen} data-premium-reference='collapsible-05'>
        <CollapsibleTrigger
          render={
            <button type='button' className={styles.moreFilters}>
              <span>
                <strong>More filters</strong>
                <small>Medium, format, experience level, language, and more.</small>
              </span>
              <ChevronDown className={moreOpen ? styles.chevronOpen : undefined} aria-hidden='true' />
            </button>
          }
        />
        <CollapsibleContent className={styles.moreFilterNote}>
          More facets remain searchable and separate. The full taxonomy is never shown as one flat list.
        </CollapsibleContent>
      </Collapsible>

      <div className={styles.filterActions}>
        <Button type='button' variant='outline' onClick={onClear}>Clear all</Button>
        <Button type='submit'>Apply filters</Button>
      </div>
    </form>
  )
}

function ResultSkeleton() {
  return (
    <div className={styles.skeletonGrid} aria-label='Loading opportunities' aria-busy='true'>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className={styles.skeletonCard}>
          <Skeleton className={styles.skeletonImage} />
          <div className={styles.skeletonCopy}>
            <Skeleton className='h-5 w-3/4' />
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='mt-5 h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className={styles.statePanel}>
      <div className={styles.stateIcon}><Search aria-hidden='true' /></div>
      <h2>No opportunities match these filters</h2>
      <p>Try removing one filter, broadening the location, or browsing every opportunity.</p>
      <Button type='button' variant='outline' onClick={onClear}>Clear filters</Button>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant='destructive' className={styles.errorPanel}>
      <AlertCircle aria-hidden='true' />
      <AlertTitle>We could not load opportunities</AlertTitle>
      <AlertDescription>The catalogue is temporarily unavailable. Your filters are still here.</AlertDescription>
      <Button type='button' variant='outline' size='sm' onClick={onRetry}>Try again</Button>
    </Alert>
  )
}

function OpportunityCard({
  opportunity,
  saved,
  onSave,
  onOpen,
}: {
  opportunity: Opportunity
  saved: boolean
  onSave: () => void
  onOpen: () => void
}) {
  return (
    <Card
      role='article'
      variant='interactive'
      className={styles.opportunityCard}
      data-premium-reference='card-06'
    >
      <button type='button' className={styles.cardOpenButton} onClick={onOpen} aria-label={`View ${opportunity.title}`}>
        <span className={styles.imageFrame}>
          {opportunity.imageSrc ? (
            <Image
              src={opportunity.imageSrc}
              alt={opportunity.imageAlt ?? ''}
              fill
              sizes='(min-width: 1200px) 190px, (min-width: 720px) 160px, 96px'
              className={styles.cardImage}
              loading='eager'
            />
          ) : (
            <span className={styles.imageFallback} aria-hidden='true'>{opportunityInitials(opportunity)}</span>
          )}
        </span>
        <span className={styles.cardBody}>
          <span className={styles.opportunityType}>{opportunity.type}</span>
          <span className={styles.cardTitle}>{opportunity.title}</span>
          <span className={styles.organization}>{opportunity.organization ?? 'Organization not confirmed'}</span>
          <span className={styles.factGrid}>
            <span><CalendarDays aria-hidden='true' /><span>{opportunity.deadline}</span></span>
            <span><Tag aria-hidden='true' /><span>{opportunity.fee}</span></span>
            <span><MapPin aria-hidden='true' /><span>{opportunity.reach}</span></span>
          </span>
        </span>
      </button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className={styles.saveButton}
        aria-label={saved ? `Remove ${opportunity.title} from Tracker` : `Save ${opportunity.title} to Tracker`}
        aria-pressed={saved}
        onClick={onSave}
      >
        {saved ? <Check aria-hidden='true' /> : <Bookmark aria-hidden='true' />}
      </Button>
      <span className={styles.saveLabel} aria-hidden='true'>{saved ? 'In Tracker' : 'Save'}</span>
    </Card>
  )
}

function OpportunityDetail({
  opportunity,
  saved,
  onSave,
}: {
  opportunity: Opportunity | null
  saved: boolean
  onSave: () => void
}) {
  if (!opportunity) return null

  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHero}>
        <div className={styles.detailImageFrame}>
          {opportunity.imageSrc ? (
            <Image
              src={opportunity.imageSrc}
              alt={opportunity.imageAlt ?? ''}
              fill
              sizes='(min-width: 640px) 240px, 120px'
              className={styles.cardImage}
            />
          ) : (
            <span className={styles.imageFallback} aria-hidden='true'>{opportunityInitials(opportunity)}</span>
          )}
        </div>
        <div>
          <p className={styles.opportunityType}>{opportunity.type}</p>
          <h2>{opportunity.title}</h2>
          <p className={styles.organization}>{opportunity.organization ?? 'Organization not confirmed'}</p>
          <div className={styles.detailFacts}>
            <span><CalendarDays aria-hidden='true' />{opportunity.deadline}</span>
            <span><Tag aria-hidden='true' />{opportunity.fee}</span>
            <span><Globe2 aria-hidden='true' />{opportunity.reach}</span>
          </div>
          <Button type='button' onClick={onSave} variant={saved ? 'secondary' : 'default'}>
            {saved ? <Check aria-hidden='true' /> : <Bookmark aria-hidden='true' />}
            {saved ? 'In Tracker' : 'Save to Tracker'}
          </Button>
        </div>
      </div>

      <section className={styles.detailSection}>
        <h3>Summary</h3>
        <p>{opportunity.summary}</p>
      </section>

      <div className={styles.detailColumns}>
        <section className={styles.detailSection}>
          <h3>Why this may fit</h3>
          <ul className={styles.checkList}>
            {opportunity.practices.slice(0, 3).map((practice) => (
              <li key={practice}><Check aria-hidden='true' />Matches your practice: {practice}</li>
            ))}
            {opportunity.fee === 'No fee' ? <li><Check aria-hidden='true' />Matches your preference: No fee</li> : null}
          </ul>
        </section>
        <section className={styles.detailSection}>
          <h3>Eligibility</h3>
          <ul>{opportunity.eligibility.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <div className={styles.detailColumns}>
        <section className={styles.detailSection}>
          <h3>What to prepare</h3>
          <ul>{opportunity.preparation.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className={styles.detailSection} id='official-guidelines'>
          <h3>Official guidelines</h3>
          {opportunity.sourceUrl ? (
            <a href={opportunity.sourceUrl} target='_blank' rel='noreferrer'>
              Visit organization website <ExternalLink aria-hidden='true' />
            </a>
          ) : (
            <p>Official link not available in this preview.</p>
          )}
        </section>
      </div>

      <button type='button' className={styles.reportButton}>
        <Flag aria-hidden='true' /> Report an issue
      </button>
    </div>
  )
}

function ReviewToolbar({ state, onChange }: { state: ReviewState; onChange: (state: ReviewState) => void }) {
  return (
    <div className={styles.reviewToolbar} data-review-tools aria-label='Design review states'>
      <span>Review state</span>
      {(['default', 'loading', 'empty', 'error'] as const).map((item) => (
        <button key={item} type='button' data-active={state === item} onClick={() => onChange(item)}>{item}</button>
      ))}
    </div>
  )
}

export function OpportunitiesOverhaulPreview() {
  const [reviewState, setReviewState] = useState<ReviewState>('default')
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters)
  const [savedIds, setSavedIds] = useState(() => new Set<string>(['north-river-review']))
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sort, setSort] = useState('Soonest deadline')
  const [page, setPage] = useState(1)
  const pageSize = 4

  const filtered = useMemo(() => opportunities.filter((opportunity) => {
    const normalizedQuery = query.toLowerCase()
    const matchesQuery = !normalizedQuery || `${opportunity.title} ${opportunity.organization ?? ''}`.toLowerCase().includes(normalizedQuery)
    const matchesType = appliedFilters.types.length === 0 || appliedFilters.types.includes(opportunity.type)
    const matchesPractice = appliedFilters.practices.length === 0 || appliedFilters.practices.some((practice) => opportunity.practices.includes(practice))
    const matchesReach = appliedFilters.reach === 'Anywhere'
      || (appliedFilters.reach === 'Online' && opportunity.reach.toLowerCase().includes('online'))
      || (appliedFilters.reach === 'Nigeria' && opportunity.reach.toLowerCase().includes('nigeria'))
      || (appliedFilters.reach === 'In person' && !opportunity.reach.toLowerCase().includes('online'))
    const matchesDeadline = appliedFilters.deadline === 'Any time'
      || (appliedFilters.deadline === 'Next 30 days' && ['north-river-review', 'woodstock-film-festival'].includes(opportunity.id))
      || (appliedFilters.deadline === 'Rolling' && opportunity.deadlineKind === 'rolling')
      || (appliedFilters.deadline === 'Deadline not listed' && opportunity.deadlineKind === 'unknown')
    const matchesFee = appliedFilters.fee === 'Any fee'
      || (appliedFilters.fee === 'No fee' && opportunity.fee === 'No fee')
      || (appliedFilters.fee === 'Fee listed' && opportunity.fee.startsWith('$'))
      || (appliedFilters.fee === 'Fee not listed' && opportunity.fee === 'Fee not listed')
    return matchesQuery && matchesType && matchesPractice && matchesReach && matchesDeadline && matchesFee
  }), [appliedFilters, query])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sort === 'Title A–Z') return a.title.localeCompare(b.title)
    if (sort === 'Recently added') return opportunities.indexOf(b) - opportunities.indexOf(a)

    const dateValue = (opportunity: Opportunity) => {
      if (opportunity.deadlineKind === 'rolling') return Number.MAX_SAFE_INTEGER - 1
      if (opportunity.deadlineKind === 'unknown') return Number.MAX_SAFE_INTEGER
      return Date.parse(opportunity.deadline)
    }

    return dateValue(a) - dateValue(b)
  }), [filtered, sort])

  const resultCount = reviewState === 'empty' ? 0 : sorted.length
  const pageCount = Math.max(1, Math.ceil(resultCount / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = reviewState === 'empty'
    ? []
    : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const activeLabels = activeFilterLabels(appliedFilters)
  const selectedOpportunity = opportunities.find((opportunity) => opportunity.id === detailId) ?? null

  function runLoading(action: () => void) {
    setReviewState('loading')
    window.setTimeout(() => {
      action()
      setReviewState('default')
    }, 500)
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    runLoading(() => setQuery(queryInput.trim()))
  }

  function applyFilters() {
    setPage(1)
    runLoading(() => setAppliedFilters(draftFilters))
    setFilterSheetOpen(false)
  }

  function clearFilters() {
    setPage(1)
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setQueryInput('')
    setQuery('')
    setReviewState('default')
  }

  function removeFilter(key: string) {
    setPage(1)
    const [kind, value] = key.split(':')
    const next = { ...appliedFilters }
    if (kind === 'type') next.types = next.types.filter((item) => item !== value)
    if (kind === 'practice') next.practices = next.practices.filter((item) => item !== value)
    if (kind === 'reach') next.reach = 'Anywhere'
    if (kind === 'deadline') next.deadline = 'Any time'
    if (kind === 'fee') next.fee = 'Any fee'
    setAppliedFilters(next)
    setDraftFilters(next)
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <a href='#main-content' className='missa-wordmark missa-wordmark--app'>Missa</a>
          <nav className={styles.desktopNav} aria-label='Primary navigation'>
            <a href='#main-content' aria-current='page'>Opportunities</a>
            <a href='#tracker'>Tracker</a>
            <a href='#library'>Library</a>
            <a href='#guides'>Guides</a>
            <a href='#organization'>Organization</a>
          </nav>
          <div className={styles.headerActions}>
            <Button type='button' variant='ghost' size='icon' aria-label='Search Missa'><Search aria-hidden='true' /></Button>
            <button type='button' className={styles.avatar} aria-label='Open Profile menu'>A</button>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className={styles.mobileMenuButton}
              aria-label='Open navigation'
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? <X aria-hidden='true' /> : <Menu aria-hidden='true' />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <nav className={styles.mobileNav} aria-label='Mobile navigation'>
            <a href='#main-content' aria-current='page'>Opportunities</a>
            <a href='#tracker'>Tracker</a>
            <a href='#library'>Library</a>
            <a href='#guides'>Guides</a>
            <a href='#organization'>Organization</a>
          </nav>
        ) : null}
      </header>

      <main id='main-content' className={styles.main}>
        <section className={styles.pageIntro} aria-labelledby='opportunities-title'>
          <p className={styles.eyebrow}>Opportunities</p>
          <h1 id='opportunities-title'>Opportunities</h1>
          <p>Find credible calls, see why they may fit, and keep the next deadline in view.</p>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.filterSidebar} aria-label='Opportunity filters'>
            <FilterPanel
              value={draftFilters}
              onChange={setDraftFilters}
              onApply={applyFilters}
              onClear={clearFilters}
            />
          </aside>

          <section className={styles.resultsArea} aria-labelledby='results-heading'>
            <form className={styles.searchForm} onSubmit={submitSearch} role='search'>
              <Search aria-hidden='true' />
              <Input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder='Search opportunities or organizations'
                aria-label='Search opportunities or organizations'
                className={styles.searchInput}
              />
              <Button type='submit' className={styles.searchSubmit} aria-label='Search opportunities'>
                <Search aria-hidden='true' />
                <span className={styles.searchButtonText}>Search</span>
              </Button>
            </form>

            <div className={styles.mobileFilterRow}>
              <Button type='button' variant='outline' onClick={() => setFilterSheetOpen(true)}>
                <Filter aria-hidden='true' /> Filters
                {activeLabels.length ? <span className={styles.filterCount}>{activeLabels.length}</span> : null}
              </Button>
            </div>

            <div className={styles.activeFilters} aria-label='Active filters'>
              {activeLabels.map(({ key, label }) => (
                <button key={key} type='button' onClick={() => removeFilter(key)}>
                  {label}<X aria-hidden='true' />
                  <span className='sr-only'>Remove {label} filter</span>
                </button>
              ))}
              {activeLabels.length ? <button type='button' className={styles.clearInline} onClick={clearFilters}>Clear all</button> : null}
            </div>

            <div className={styles.resultsToolbar}>
              <h2 id='results-heading' aria-live='polite'>{resultCount} {resultCount === 1 ? 'opportunity' : 'opportunities'}</h2>
              <label className={styles.sortControl}>
                <span>Sort by</span>
                <select value={sort} onChange={(event) => { setPage(1); setSort(event.target.value) }}>
                  <option>Soonest deadline</option>
                  <option>Recently added</option>
                  <option>Title A–Z</option>
                </select>
              </label>
            </div>

            {reviewState === 'loading' ? <ResultSkeleton /> : null}
            {reviewState === 'error' ? <ErrorState onRetry={() => setReviewState('default')} /> : null}
            {reviewState !== 'loading' && reviewState !== 'error' && visible.length === 0 ? <EmptyState onClear={clearFilters} /> : null}
            {reviewState !== 'loading' && reviewState !== 'error' && visible.length > 0 ? (
              <div className={styles.resultGrid}>
                {visible.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    saved={savedIds.has(opportunity.id)}
                    onSave={() => toggleSaved(opportunity.id)}
                    onOpen={() => setDetailId(opportunity.id)}
                  />
                ))}
              </div>
            ) : null}

            {reviewState === 'default' && resultCount > pageSize ? (
              <nav className={styles.pagination} aria-label='Results pages'>
                <Button type='button' variant='outline' disabled={currentPage === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  pageNumber === currentPage ? (
                    <span key={pageNumber} aria-current='page'>{pageNumber}</span>
                  ) : (
                    <button key={pageNumber} type='button' onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                  )
                ))}
                <Button type='button' variant='outline' disabled={currentPage === pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </nav>
            ) : null}
          </section>
        </div>
      </main>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side='bottom' className={styles.filterSheet}>
          <SheetHeader>
            <SheetTitle>Filter opportunities</SheetTitle>
            <SheetDescription>Use only the details that matter for this search.</SheetDescription>
          </SheetHeader>
          <div className={styles.filterSheetBody}>
            <FilterPanel
              value={draftFilters}
              onChange={setDraftFilters}
              onApply={applyFilters}
              onClear={clearFilters}
              compact
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={detailId !== null} onOpenChange={(open) => { if (!open) setDetailId(null) }}>
        <SheetContent side='right' className={styles.detailSheet}>
          <SheetHeader className={styles.detailSheetHeader}>
            <SheetTitle className='sr-only'>{selectedOpportunity?.title ?? 'Opportunity details'}</SheetTitle>
            <SheetDescription className='sr-only'>Opportunity details and preparation information.</SheetDescription>
          </SheetHeader>
          <OpportunityDetail
            opportunity={selectedOpportunity}
            saved={selectedOpportunity ? savedIds.has(selectedOpportunity.id) : false}
            onSave={() => { if (selectedOpportunity) toggleSaved(selectedOpportunity.id) }}
          />
          <SheetFooter className={styles.detailSheetFooter}>
            <Button type='button' variant='outline' onClick={() => setDetailId(null)}>Back to results</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className='sr-only' aria-live='polite'>
        {savedIds.size} opportunities in Tracker.
      </div>

      <ReviewToolbar state={reviewState} onChange={(nextState) => { setPage(1); setReviewState(nextState) }} />
    </div>
  )
}
