'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Filter,
  Globe2,
  MapPin,
  Menu,
  Search,
  Tag,
  X,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardFooter } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { MissaWordmark } from '@/components/missa-wordmark'
import { cn } from '@/lib/utils'
import styles from './opportunities-overhaul-preview.module.css'

type OpportunityType = 'Open call' | 'Residency' | 'Award' | 'Grant' | 'Fellowship' | 'Commission'
type DeadlineKind = 'exact' | 'rolling' | 'unknown'
type ReviewState = 'normal' | 'search' | 'filtered' | 'no-results' | 'loading' | 'unavailable' | 'edge-cases'

type Opportunity = {
  id: string
  slug: string
  title: string
  organization: string | null
  type: OpportunityType
  practices: string[]
  eligibility: string[]
  locationRequirement: string
  format: string
  deadline: string
  deadlineIso?: string
  deadlineKind: DeadlineKind
  fee: string
  prize?: string
  identityAssetUrl?: string
  identityAssetAlt?: string
}

type Filters = {
  practices: string[]
  types: OpportunityType[]
  eligibility: string[]
  geography: string
  fee: string
  deadline: string
  format: string
}

type FilterChip = {
  key: string
  label: string
}

type SearchSuggestion = {
  id: string
  group: 'Opportunities' | 'Organizations' | 'Fields'
  label: string
  meta: string
  kind: 'opportunity' | 'organization' | 'practice'
}

const emptyFilters: Filters = {
  practices: [],
  types: [],
  eligibility: [],
  geography: 'Any geography',
  fee: 'Any fee',
  deadline: 'Any deadline',
  format: 'Any format',
}

const practiceOptions = ['Poetry', 'Fiction', 'Writing', 'Film', 'Visual art', 'Photography', 'Performance', 'Sound']
const typeOptions: OpportunityType[] = ['Open call', 'Residency', 'Award', 'Grant', 'Fellowship', 'Commission']
const eligibilityOptions = ['Open to Nigeria', 'Open internationally', 'Emerging practitioners', 'Collectives welcome']
const geographyOptions = ['Any geography', 'Nigeria', 'Online', 'International', 'In person', 'Location requirement not stated']
const feeOptions = ['Any fee', 'No fee', 'Fee stated', 'Fee not stated']
const deadlineOptions = ['Any deadline', 'Next 30 days', 'Rolling', 'Deadline not confirmed']
const formatOptions = ['Any format', 'Online', 'In person', 'Hybrid']
const fixtureReferenceDate = Date.parse('2026-08-10T00:00:00Z')

const opportunities: Opportunity[] = [
  {
    id: 'north-river-review',
    slug: 'north-river-review',
    title: 'North River Review — Call for Submissions',
    organization: 'North River Review',
    type: 'Open call',
    practices: ['Poetry', 'Fiction'],
    eligibility: ['Open internationally'],
    locationRequirement: 'Online',
    format: 'Online',
    deadline: '14 August 2026',
    deadlineIso: '2026-08-14',
    deadlineKind: 'exact',
    fee: 'No fee',
  },
  {
    id: 'woodstock-film-festival',
    slug: 'woodstock-film-festival',
    title: 'Woodstock Film Festival Annual Open Call',
    organization: 'Woodstock Film Festival',
    type: 'Award',
    practices: ['Film'],
    eligibility: ['Open internationally'],
    locationRequirement: 'Woodstock, NY + Online',
    format: 'Hybrid',
    deadline: '28 August 2026',
    deadlineIso: '2026-08-28',
    deadlineKind: 'exact',
    fee: 'Fee not stated',
    identityAssetUrl: '/media/home/opportunity-dance.webp',
    identityAssetAlt: 'Performer lit against a dark stage',
    prize: '$5,000',
  },
  {
    id: 'gallery-childrens-biennale',
    slug: 'gallery-childrens-biennale',
    title: "Gallery Children's Biennale 2026: Tomorrow We'll Be…",
    organization: "Gallery Children's Biennale",
    type: 'Open call',
    practices: ['Visual art', 'Performance'],
    eligibility: ['Collectives welcome'],
    locationRequirement: 'Brooklyn, NY',
    format: 'In person',
    deadline: '15 September 2026',
    deadlineIso: '2026-09-15',
    deadlineKind: 'exact',
    fee: 'Fee not stated',
    identityAssetUrl: '/media/missa-org-gallery.png',
    identityAssetAlt: 'Visitors viewing artwork in a bright gallery',
  },
  {
    id: 'compass-literary-awards',
    slug: 'compass-literary-awards',
    title: 'Compass Literary Awards in Poetry & Prose',
    organization: null,
    type: 'Award',
    practices: ['Poetry', 'Fiction'],
    eligibility: ['Open internationally'],
    locationRequirement: 'International',
    format: 'Online',
    deadline: 'Rolling',
    deadlineKind: 'rolling',
    fee: '$25',
    prize: '$2,000',
  },
  {
    id: 'flanders-arts-institute',
    slug: 'flanders-arts-institute',
    title: 'Flanders Arts Institute Research & Studio Residency',
    organization: 'Flanders Arts Institute',
    type: 'Residency',
    practices: ['Visual art', 'Photography'],
    eligibility: ['Open internationally'],
    locationRequirement: 'Brussels, Belgium',
    format: 'In person',
    deadline: '10 October 2026',
    deadlineIso: '2026-10-10',
    deadlineKind: 'exact',
    fee: 'Fee not stated',
    identityAssetUrl: '/media/home/gallery-interior.webp',
    identityAssetAlt: 'Contemporary gallery interior with visitors',
  },
  {
    id: 'lagos-contemporary-practice-grant',
    slug: 'lagos-contemporary-practice-grant',
    title: 'Lagos Contemporary Practice Production Grant',
    organization: 'Centre for Contemporary Art, Lagos',
    type: 'Grant',
    practices: ['Visual art', 'Photography'],
    eligibility: ['Open to Nigeria'],
    locationRequirement: 'Nigeria · Remote eligible',
    format: 'Hybrid',
    deadline: '18 September 2026',
    deadlineIso: '2026-09-18',
    deadlineKind: 'exact',
    fee: 'No fee',
    identityAssetUrl: '/media/home/opportunity-architecture.webp',
    identityAssetAlt: 'Contemporary arts building under a clear sky',
  },
  {
    id: 'new-voices-residency',
    slug: 'new-voices-residency',
    title: 'New Voices Exchange & Writing Residency',
    organization: 'Kunsthalle Exchange',
    type: 'Residency',
    practices: ['Writing', 'Performance'],
    eligibility: ['Emerging practitioners'],
    locationRequirement: 'Accra · In person',
    format: 'In person',
    deadline: 'Deadline not confirmed',
    deadlineKind: 'unknown',
    fee: '$15',
    identityAssetUrl: '/media/home/opportunity-mountains.webp',
    identityAssetAlt: 'Mountain landscape seen across a wide valley',
  },
  {
    id: 'long-title-edge-case',
    slug: 'long-title-edge-case',
    title: 'International Open Call for Interdisciplinary Artists Working Across Sound & Public Space',
    organization: null,
    type: 'Open call',
    practices: ['Sound', 'Film', 'Performance'],
    eligibility: ['Open internationally'],
    locationRequirement: 'Location requirement not stated',
    format: 'Hybrid',
    deadline: '30 November 2026',
    deadlineIso: '2026-11-30',
    deadlineKind: 'exact',
    fee: 'Fee not stated',
  },
  {
    id: 'open-city-poetry-prize',
    slug: 'open-city-poetry-prize',
    title: 'Open City Annual Poetry Prize',
    organization: 'Open City',
    type: 'Award',
    practices: ['Poetry'],
    eligibility: ['Open internationally'],
    locationRequirement: 'International',
    format: 'Online',
    deadline: '1 December 2026',
    deadlineIso: '2026-12-01',
    deadlineKind: 'exact',
    fee: '$25',
    prize: '$3,000',
  },
  {
    id: 'pen-america-writing-for-change',
    slug: 'pen-america-writing-for-change',
    title: 'PEN America Open Call — Writing for Change Fellowship',
    organization: 'PEN America',
    type: 'Fellowship',
    practices: ['Fiction', 'Writing'],
    eligibility: ['Open internationally'],
    locationRequirement: 'United States + Online',
    format: 'Online',
    deadline: '31 October 2026',
    deadlineIso: '2026-10-31',
    deadlineKind: 'exact',
    fee: 'No fee',
    identityAssetUrl: '/media/home/artist-at-work.webp',
    identityAssetAlt: 'Artist working at a table in a bright studio',
  },
]

const reviewStateOptions: Array<{ id: ReviewState; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'search', label: 'Search' },
  { id: 'filtered', label: 'Filtered' },
  { id: 'no-results', label: 'No results' },
  { id: 'loading', label: 'Loading' },
  { id: 'unavailable', label: 'Unavailable' },
  { id: 'edge-cases', label: 'Edge cases' },
]

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function hasActiveFilters(filters: Filters) {
  return (
    filters.practices.length > 0 ||
    filters.types.length > 0 ||
    filters.eligibility.length > 0 ||
    filters.geography !== 'Any geography' ||
    filters.fee !== 'Any fee' ||
    filters.deadline !== 'Any deadline' ||
    filters.format !== 'Any format'
  )
}

function activeFilterChips(filters: Filters): FilterChip[] {
  return [
    ...filters.practices.map((label) => ({ key: 'practice:' + label, label })),
    ...filters.types.map((label) => ({ key: 'type:' + label, label })),
    ...filters.eligibility.map((label) => ({ key: 'eligibility:' + label, label })),
    ...(filters.geography === 'Any geography' ? [] : [{ key: 'geography:' + filters.geography, label: filters.geography }]),
    ...(filters.fee === 'Any fee' ? [] : [{ key: 'fee:' + filters.fee, label: filters.fee }]),
    ...(filters.deadline === 'Any deadline' ? [] : [{ key: 'deadline:' + filters.deadline, label: filters.deadline }]),
    ...(filters.format === 'Any format' ? [] : [{ key: 'format:' + filters.format, label: filters.format }]),
  ]
}

function matchesDeadlineWindow(item: Opportunity, deadline: string) {
  if (deadline === 'Any deadline') return true
  if (deadline === 'Rolling') return item.deadlineKind === 'rolling'
  if (deadline === 'Deadline not confirmed') return item.deadlineKind === 'unknown'
  if (deadline === 'Next 30 days' && item.deadlineIso) {
    const difference = Date.parse(item.deadlineIso + 'T00:00:00Z') - fixtureReferenceDate
    return difference >= 0 && difference <= 30 * 24 * 60 * 60 * 1000
  }
  return false
}

function matchesGeography(item: Opportunity, geography: string) {
  if (geography === 'Any geography') return true
  if (geography === 'Nigeria') return item.locationRequirement.toLowerCase().includes('nigeria')
  if (geography === 'Online') return item.format === 'Online' || item.locationRequirement.toLowerCase().includes('online')
  if (geography === 'International') return item.locationRequirement === 'International' || item.eligibility.includes('Open internationally')
  if (geography === 'In person') return item.format === 'In person'
  return item.locationRequirement === geography
}

function matchesFee(item: Opportunity, fee: string) {
  if (fee === 'Any fee') return true
  if (fee === 'No fee') return item.fee === 'No fee'
  if (fee === 'Fee not stated') return item.fee === 'Fee not stated'
  return !['No fee', 'Fee not stated'].includes(item.fee)
}

function deadlineSortValue(item: Opportunity) {
  if (item.deadlineIso) return Date.parse(item.deadlineIso + 'T00:00:00Z')
  if (item.deadlineKind === 'rolling') return Number.MAX_SAFE_INTEGER - 1
  return Number.MAX_SAFE_INTEGER
}

function nextCalendarDate(dateIso: string) {
  const date = new Date(dateIso + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}

function escapeCalendarText(value: string) {
  return value.replace(/\\/gu, '\\\\').replace(/,/gu, '\\,').replace(/;/gu, '\\;').replace(/\n/gu, '\\n')
}

function calendarHref(item: Opportunity) {
  if (!item.deadlineIso) return undefined
  const start = item.deadlineIso.replaceAll('-', '')
  const organization = item.organization ?? 'Organization not confirmed'
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Missa//Opportunity deadline//EN',
    'BEGIN:VEVENT',
    'UID:' + item.id + '@usemissa.com',
    'DTSTART;VALUE=DATE:' + start,
    'DTEND;VALUE=DATE:' + nextCalendarDate(item.deadlineIso),
    'SUMMARY:' + escapeCalendarText(item.title),
    'DESCRIPTION:' + escapeCalendarText(organization + ' opportunity deadline'),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(calendar)
}

function FilterSection({
  title,
  defaultOpen = false,
  activeCount = 0,
  children,
}: {
  title: string
  defaultOpen?: boolean
  activeCount?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={styles.filterSection}>
      <CollapsibleTrigger
        render={
          <button type="button" className={styles.filterSectionTrigger}>
            <span className={styles.filterSectionLabel}>
              {title}
              {activeCount > 0 ? <small>{activeCount} selected</small> : null}
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        }
      />
      <CollapsibleContent className={styles.filterSectionContent}>{children}</CollapsibleContent>
    </Collapsible>
  )
}

function CheckboxGroup({
  legend,
  idPrefix,
  options,
  selected,
  onToggle,
}: {
  legend: string
  idPrefix: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <fieldset className={styles.checkboxList}>
      <legend className={styles.visuallyHidden}>{legend}</legend>
      {options.map((option) => {
        const id = idPrefix + '-' + option.toLowerCase().replace(/[^a-z0-9]+/gu, '-')
        return (
          <div key={option} className={styles.checkboxRow}>
            <input
              id={id}
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
            />
            <label htmlFor={id}>{option}</label>
          </div>
        )
      })}
    </fieldset>
  )
}

function SelectFilter({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className={styles.selectField} htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function FilterPanel({
  idPrefix,
  value,
  onChange,
  onClear,
  showHeading = true,
}: {
  idPrefix: string
  value: Filters
  onChange: (value: Filters) => void
  onClear: () => void
  showHeading?: boolean
}) {
  return (
    <div className={styles.filterForm}>
      {showHeading ? (
        <div className={styles.filterHeadingRow}>
          <h2>Filter opportunities</h2>
          <button type="button" className={styles.textButton} onClick={onClear} disabled={!hasActiveFilters(value)}>
            Clear all
          </button>
        </div>
      ) : null}

      <FilterSection title="Field" defaultOpen activeCount={value.practices.length}>
        <CheckboxGroup
          legend="Field"
          idPrefix={idPrefix + '-practice'}
          options={practiceOptions}
          selected={value.practices}
          onToggle={(option) => onChange({ ...value, practices: toggleValue(value.practices, option) })}
        />
      </FilterSection>

      <FilterSection title="Opportunity type" defaultOpen={idPrefix === 'desktop'} activeCount={value.types.length}>
        <CheckboxGroup
          legend="Opportunity type"
          idPrefix={idPrefix + '-type'}
          options={typeOptions}
          selected={value.types}
          onToggle={(option) =>
            onChange({ ...value, types: toggleValue(value.types, option as OpportunityType) })
          }
        />
      </FilterSection>

      <FilterSection title="Eligibility" activeCount={value.eligibility.length}>
        <CheckboxGroup
          legend="Eligibility"
          idPrefix={idPrefix + '-eligibility'}
          options={eligibilityOptions}
          selected={value.eligibility}
          onToggle={(option) => onChange({ ...value, eligibility: toggleValue(value.eligibility, option) })}
        />
      </FilterSection>

      <FilterSection title="Geography" activeCount={value.geography === geographyOptions[0] ? 0 : 1}>
        <SelectFilter
          id={idPrefix + '-geography'}
          label="Geography"
          value={value.geography}
          options={geographyOptions}
          onChange={(geography) => onChange({ ...value, geography })}
        />
      </FilterSection>

      <FilterSection title="Fee" activeCount={value.fee === feeOptions[0] ? 0 : 1}>
        <SelectFilter
          id={idPrefix + '-fee'}
          label="Application fee"
          value={value.fee}
          options={feeOptions}
          onChange={(fee) => onChange({ ...value, fee })}
        />
      </FilterSection>

      <FilterSection title="Deadline" activeCount={value.deadline === deadlineOptions[0] ? 0 : 1}>
        <SelectFilter
          id={idPrefix + '-deadline'}
          label="Deadline"
          value={value.deadline}
          options={deadlineOptions}
          onChange={(deadline) => onChange({ ...value, deadline })}
        />
      </FilterSection>

      <FilterSection title="Format" activeCount={value.format === formatOptions[0] ? 0 : 1}>
        <SelectFilter
          id={idPrefix + '-format'}
          label="Format"
          value={value.format}
          options={formatOptions}
          onChange={(format) => onChange({ ...value, format })}
        />
      </FilterSection>
    </div>
  )
}

function OpportunityCard({
  item,
  saved,
  eagerImage,
  onSave,
}: {
  item: Opportunity
  saved: boolean
  eagerImage: boolean
  onSave: () => void
}) {
  const detailHref = '/opportunities/' + item.slug
  const calendar = item.deadlineKind === 'exact' ? calendarHref(item) : undefined

  return (
    <Card role="article" variant="interactive" className={styles.opportunityCard} data-opportunity-id={item.id}>
      <div className={styles.cardContent} data-has-media={Boolean(item.identityAssetUrl)}>
        {item.identityAssetUrl ? (
          <Link href={detailHref} className={styles.imageFrame} aria-label={'Open ' + item.title}>
            <Image
              src={item.identityAssetUrl}
              alt={item.identityAssetAlt ?? ''}
              fill
              priority={eagerImage}
              sizes="(min-width: 1180px) 152px, (min-width: 720px) 132px, 108px"
              className={styles.cardImage}
            />
          </Link>
        ) : null}

        <div className={styles.cardBody}>
          <div className={styles.cardHeader}>
            <span className={styles.opportunityType}>{item.type}</span>
            {item.prize ? <span className={styles.prizeBadge}>Prize {item.prize}</span> : null}
          </div>
          <h3 className={styles.cardTitle}>
            <Link href={detailHref}>{item.title}</Link>
          </h3>
          <p className={styles.organization}>{item.organization ?? 'Organization not confirmed'}</p>
          <p className={styles.practices}>{item.practices.join(' · ')}</p>

          <dl className={styles.factGrid}>
            <div>
              <dt>Deadline</dt>
              <dd><CalendarDays aria-hidden="true" />{item.deadline}</dd>
            </div>
            <div>
              <dt>Fee</dt>
              <dd><Tag aria-hidden="true" />{item.fee}</dd>
            </div>
            <div>
              <dt>Location requirement</dt>
              <dd><MapPin aria-hidden="true" />{item.locationRequirement}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd><Globe2 aria-hidden="true" />{item.format}</dd>
            </div>
          </dl>
        </div>
      </div>

      <CardFooter className={styles.cardActions}>
        <div className={styles.cardUtilityActions}>
          <button
            type="button"
            className={cn(styles.cardAction, saved && styles.cardActionSaved)}
            aria-pressed={saved}
            onClick={onSave}
          >
            {saved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
            {saved ? 'Saved' : 'Save'}
          </button>
          {calendar ? (
            <a
              href={calendar}
              download={item.slug + '-deadline.ics'}
              className={styles.cardAction}
              aria-label={'Add ' + item.title + ' deadline to Calendar'}
            >
              <CalendarDays aria-hidden="true" />
              Add to Calendar
            </a>
          ) : null}
        </div>
        <Link href={detailHref} className={styles.openAction}>
          Open <ArrowUpRight aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className={styles.loadingState} aria-busy="true" aria-label="Loading opportunities">
      <span className={styles.visuallyHidden}>Loading opportunities</span>
      <div className={styles.skeletonGrid} aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <Card className={styles.skeletonCard} key={item}>
            {item % 2 === 0 ? <Skeleton className={styles.skeletonImage} /> : null}
            <div className={styles.skeletonCopy}>
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ query, filtered, onClear }: { query: string; filtered: boolean; onClear: () => void }) {
  return (
    <section className={styles.statePanel} aria-labelledby="no-results-title">
      <span className={styles.stateIcon}><Search aria-hidden="true" /></span>
      <h2 id="no-results-title">{query ? 'No opportunities match “' + query + '”' : 'No opportunities match these filters'}</h2>
      <p>{query ? 'Try a different title, organization, or field.' : 'Remove one filter or clear all filters.'}</p>
      <Button type="button" variant="outline" onClick={onClear}>
        {filtered ? 'Clear filters' : 'Clear search'}
      </Button>
    </section>
  )
}

function UnavailableState({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert className={styles.errorPanel}>
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Opportunities are temporarily unavailable</AlertTitle>
      <AlertDescription>Try again in a moment.</AlertDescription>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>Try again</Button>
    </Alert>
  )
}

export function OpportunitiesOverhaulPreview() {
  const [reviewState, setReviewState] = useState<ReviewState>('normal')
  const [queryInput, setQueryInput] = useState('')
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters })
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set())
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [statusMessage, setStatusMessage] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const normalizedQuery = queryInput.trim().toLowerCase()

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (normalizedQuery.length < 2) return []

    const opportunityMatches = opportunities
      .filter((item) =>
        [item.title, item.organization ?? '', item.practices.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 3)
      .map((item) => ({
        id: 'opportunity-' + item.id,
        group: 'Opportunities' as const,
        label: item.title,
        meta: item.organization ?? 'Organization not confirmed',
        kind: 'opportunity' as const,
      }))

    const organizations = Array.from(
      new Set(opportunities.map((item) => item.organization).filter((item): item is string => Boolean(item))),
    )
      .filter((organization) => organization.toLowerCase().includes(normalizedQuery))
      .slice(0, 2)
      .map((organization) => ({
        id: 'organization-' + organization.toLowerCase().replace(/[^a-z0-9]+/gu, '-'),
        group: 'Organizations' as const,
        label: organization,
        meta: 'Organization',
        kind: 'organization' as const,
      }))

    const practices = practiceOptions
      .filter((practice) => practice.toLowerCase().includes(normalizedQuery))
      .slice(0, 3)
      .map((practice) => ({
        id: 'practice-' + practice.toLowerCase().replace(/[^a-z0-9]+/gu, '-'),
        group: 'Fields' as const,
        label: practice,
        meta: 'Filter by field',
        kind: 'practice' as const,
      }))

    return [...opportunityMatches, ...organizations, ...practices]
  }, [normalizedQuery])

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => {
      const searchableText = [item.title, item.organization ?? '', item.practices.join(' ')].join(' ').toLowerCase()
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery)
      const matchesPractice = !filters.practices.length || filters.practices.some((value) => item.practices.includes(value))
      const matchesType = !filters.types.length || filters.types.includes(item.type)
      const matchesEligibility = !filters.eligibility.length || filters.eligibility.some((value) => item.eligibility.includes(value))
      return (
        matchesQuery &&
        matchesPractice &&
        matchesType &&
        matchesEligibility &&
        matchesGeography(item, filters.geography) &&
        matchesFee(item, filters.fee) &&
        matchesDeadlineWindow(item, filters.deadline) &&
        (filters.format === 'Any format' || item.format === filters.format)
      )
    })
  }, [filters, normalizedQuery])

  const sortedOpportunities = useMemo(
    () => [...filteredOpportunities].sort((a, b) => deadlineSortValue(a) - deadlineSortValue(b)),
    [filteredOpportunities],
  )

  const visibleOpportunities = reviewState === 'edge-cases'
    ? sortedOpportunities.filter((item) =>
        ['woodstock-film-festival', 'compass-literary-awards', 'new-voices-residency', 'long-title-edge-case'].includes(item.id),
      )
    : sortedOpportunities

  const chips = activeFilterChips(filters)
  const activeCount = chips.length
  const hasFilters = hasActiveFilters(filters)
  const showSuggestions = searchOpen && normalizedQuery.length >= 2

  function updateFilters(next: Filters) {
    setFilters(next)
    setReviewState('normal')
  }

  function clearAll() {
    setQueryInput('')
    setFilters({ ...emptyFilters })
    setSearchOpen(false)
    setActiveSuggestion(-1)
    setReviewState('normal')
  }

  function removeFilter(key: string) {
    const separator = key.indexOf(':')
    const kind = key.slice(0, separator)
    const value = key.slice(separator + 1)
    const next = { ...filters }
    if (kind === 'practice') next.practices = filters.practices.filter((item) => item !== value)
    if (kind === 'type') next.types = filters.types.filter((item) => item !== value)
    if (kind === 'eligibility') next.eligibility = filters.eligibility.filter((item) => item !== value)
    if (kind === 'geography') next.geography = 'Any geography'
    if (kind === 'fee') next.fee = 'Any fee'
    if (kind === 'deadline') next.deadline = 'Any deadline'
    if (kind === 'format') next.format = 'Any format'
    updateFilters(next)
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    if (suggestion.kind === 'practice') {
      setFilters((current) => ({
        ...current,
        practices: current.practices.includes(suggestion.label)
          ? current.practices
          : [...current.practices, suggestion.label],
      }))
      setQueryInput('')
    } else {
      setQueryInput(suggestion.label)
    }
    setSearchOpen(false)
    setActiveSuggestion(-1)
    setReviewState('normal')
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setSearchOpen(false)
      setActiveSuggestion(-1)
      return
    }
    if (!searchSuggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSearchOpen(true)
      setActiveSuggestion((current) => (current + 1) % searchSuggestions.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSearchOpen(true)
      setActiveSuggestion((current) => (current <= 0 ? searchSuggestions.length - 1 : current - 1))
    }
    if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault()
      selectSuggestion(searchSuggestions[activeSuggestion])
    }
  }

  function toggleSaved(item: Opportunity) {
    setSavedIds((current) => {
      const next = new Set(current)
      if (next.has(item.id)) {
        next.delete(item.id)
        setStatusMessage('Removed “' + item.title + '” from saved opportunities.')
      } else {
        next.add(item.id)
        setStatusMessage('Saved “' + item.title + '”.')
      }
      return next
    })
  }

  function applyReviewState(nextState: ReviewState) {
    setReviewState(nextState)
    setSearchOpen(false)
    setActiveSuggestion(-1)
    if (nextState === 'search') {
      setQueryInput('poetry')
      setFilters({ ...emptyFilters })
      return
    }
    if (nextState === 'filtered') {
      setQueryInput('')
      setFilters({ ...emptyFilters, practices: ['Visual art'], types: ['Residency'] })
      return
    }
    if (nextState === 'no-results') {
      setQueryInput('ceramics')
      setFilters({ ...emptyFilters })
      return
    }
    setQueryInput('')
    setFilters({ ...emptyFilters })
  }

  const groupedSuggestions = (['Opportunities', 'Organizations', 'Fields'] as const)
    .map((group) => ({ group, items: searchSuggestions.filter((item) => item.group === group) }))
    .filter((group) => group.items.length)

  const resultsTitle = normalizedQuery
    ? 'Results for “' + queryInput.trim() + '”'
    : hasFilters
      ? 'Filtered opportunities'
      : reviewState === 'edge-cases'
        ? 'Edge-case opportunities'
        : 'Opportunities'

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>Skip to opportunities</a>
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <MissaWordmark size="app" />
          <nav className={styles.desktopNav} aria-label="Primary navigation">
            <a href="#main-content" aria-current="page">Opportunities</a>
            <Link href="/tracker">Tracker</Link>
            <Link href="/library">Library</Link>
            <Link href="/profile">Profile</Link>
          </nav>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={styles.mobileMenuButton}
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
        {mobileMenuOpen ? (
          <nav className={styles.mobileNav} aria-label="Mobile navigation">
            <a href="#main-content" aria-current="page" onClick={() => setMobileMenuOpen(false)}>Opportunities</a>
            <Link href="/tracker">Tracker</Link>
            <Link href="/library">Library</Link>
            <Link href="/profile">Profile</Link>
          </nav>
        ) : null}
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.pageIntro} aria-labelledby="opportunities-title">
          <h1 id="opportunities-title">Find your next opportunity.</h1>
          <p>Discover grants, residencies, fellowships, commissions, and open calls that fit your work.</p>
        </section>

        <section className={styles.searchSection} aria-labelledby="search-label">
          <div className={styles.searchHeading}>
            <label id="search-label" htmlFor="opportunity-search">Search opportunities</label>
            <span id="search-help">Search by title, organization, or field</span>
          </div>
          <div
            className={styles.searchWrap}
            role="search"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false)
            }}
          >
            <div className={styles.searchField}>
              <Search aria-hidden="true" />
              <input
                ref={searchInputRef}
                id="opportunity-search"
                type="search"
                role="combobox"
                value={queryInput}
                placeholder="Title, organization, or field"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="opportunity-search-suggestions"
                aria-activedescendant={activeSuggestion >= 0 ? searchSuggestions[activeSuggestion]?.id : undefined}
                aria-describedby="search-help"
                onFocus={() => setSearchOpen(normalizedQuery.length >= 2)}
                onChange={(event) => {
                  setQueryInput(event.target.value)
                  setSearchOpen(event.target.value.trim().length >= 2)
                  setActiveSuggestion(-1)
                  setReviewState('normal')
                }}
                onKeyDown={handleSearchKeyDown}
              />
              {queryInput ? (
                <button
                  type="button"
                  className={styles.searchClear}
                  aria-label="Clear search"
                  onClick={() => {
                    setQueryInput('')
                    setSearchOpen(false)
                    setActiveSuggestion(-1)
                    setReviewState('normal')
                    searchInputRef.current?.focus()
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              ) : <kbd aria-hidden="true">⌘K</kbd>}
            </div>

            {showSuggestions ? (
              <div id="opportunity-search-suggestions" className={styles.searchSuggestions} role="listbox" aria-label="Search suggestions">
                {groupedSuggestions.length ? groupedSuggestions.map(({ group, items }) => (
                  <div key={group} className={styles.suggestionGroup} role="group" aria-label={group}>
                    <p>{group}</p>
                    {items.map((suggestion) => {
                      const index = searchSuggestions.findIndex((item) => item.id === suggestion.id)
                      return (
                        <button
                          key={suggestion.id}
                          id={suggestion.id}
                          type="button"
                          role="option"
                          tabIndex={-1}
                          aria-selected={activeSuggestion === index}
                          className={styles.suggestionItem}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveSuggestion(index)}
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          <span>{suggestion.label}</span>
                          <small>{suggestion.meta}</small>
                        </button>
                      )
                    })}
                  </div>
                )) : (
                  <p className={styles.searchEmpty}>No matching opportunities, organizations, or fields.</p>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.filterSidebar} aria-label="Opportunity filters">
            <FilterPanel
              idPrefix="desktop"
              value={filters}
              onChange={updateFilters}
              onClear={() => updateFilters({ ...emptyFilters })}
            />
          </aside>

          <section className={styles.resultsArea} aria-labelledby="results-heading">
            {chips.length ? (
              <div className={styles.activeFilters} aria-label="Active filters">
                {chips.map((chip) => (
                  <span key={chip.key} className={styles.filterChip}>
                    {chip.label}
                    <button type="button" onClick={() => removeFilter(chip.key)} aria-label={'Remove ' + chip.label + ' filter'}>
                      <X aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <button type="button" className={styles.clearInline} onClick={() => updateFilters({ ...emptyFilters })}>Clear all</button>
              </div>
            ) : null}

            <div className={styles.resultsToolbar}>
              <div>
                <h2 id="results-heading">{resultsTitle}</h2>
                <p aria-live="polite">
                  {reviewState === 'loading'
                    ? 'Loading opportunities'
                    : reviewState === 'unavailable'
                      ? 'Results unavailable'
                      : visibleOpportunities.length + ' ' + (visibleOpportunities.length === 1 ? 'opportunity' : 'opportunities')}
                </p>
              </div>
              <div className={styles.resultsControls}>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.mobileFilterButton}
                  aria-haspopup="dialog"
                  onClick={() => setFilterSheetOpen(true)}
                >
                  <Filter aria-hidden="true" />
                  Filters{activeCount ? ' (' + activeCount + ')' : ''}
                </Button>
                <span className={styles.sortNote}><CalendarDays aria-hidden="true" />Soonest deadline first</span>
              </div>
            </div>

            {reviewState === 'loading' ? (
              <LoadingState />
            ) : reviewState === 'unavailable' ? (
              <UnavailableState onRetry={() => applyReviewState('normal')} />
            ) : visibleOpportunities.length ? (
              <div className={styles.resultGrid}>
                {visibleOpportunities.map((item, index) => (
                  <OpportunityCard
                    key={item.id}
                    item={item}
                    saved={savedIds.has(item.id)}
                    eagerImage={index < 2}
                    onSave={() => toggleSaved(item)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState query={queryInput.trim()} filtered={hasFilters} onClear={clearAll} />
            )}
          </section>
        </div>
      </main>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className={styles.filterSheet}>
          <SheetHeader className={styles.filterSheetHeader}>
            <SheetTitle>Filter opportunities</SheetTitle>
            <SheetDescription>Choose each detail separately.</SheetDescription>
          </SheetHeader>
          <div className={styles.filterSheetBody}>
            <FilterPanel
              idPrefix="mobile"
              value={filters}
              onChange={updateFilters}
              onClear={() => updateFilters({ ...emptyFilters })}
              showHeading={false}
            />
          </div>
          <SheetFooter className={styles.filterSheetFooter}>
            <button
              type="button"
              className={styles.sheetClearButton}
              onClick={() => updateFilters({ ...emptyFilters })}
              disabled={!hasFilters}
            >
              Clear all
            </button>
            <SheetClose render={<Button type="button" />}>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <p className={styles.liveStatus} role="status" aria-live="polite">{statusMessage}</p>

      <aside className={styles.reviewToolbar} aria-label="Review states" data-review-tools>
        <details>
          <summary>
            <span>States</span>
            <strong>{reviewStateOptions.find((option) => option.id === reviewState)?.label}</strong>
          </summary>
          <div>
            {reviewStateOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={reviewState === option.id}
                onClick={() => applyReviewState(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </details>
      </aside>
    </div>
  )
}
