'use client'

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarRange,
  Check,
  ChevronRight,
  CircleAlert,
  Download,
  FileQuestion,
  Filter,
  Info,
  Layers3,
  LockKeyhole,
  Menu,
  Minus,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import styles from './organization-insights-directions.module.css'

type Direction = 'brief' | 'program' | 'analysis'
type Fixture =
  | 'healthy'
  | 'empty'
  | 'single'
  | 'partial'
  | 'mixed'
  | 'reviews-empty'
  | 'corrected'
  | 'imported'
  | 'timezone'
  | 'incomparable'
  | 'large'
  | 'multi-taxonomy'
  | 'deprecated-taxonomy'
  | 'small-sensitive'
  | 'reviewer'
  | 'finance'
  | 'legal'
  | 'viewer'
  | 'restricted-program'
  | 'loading'
  | 'error'
  | 'offline'
  | 'export-denied'
  | 'guest'

type Role = 'Owner' | 'Program manager' | 'Reviewer' | 'Finance' | 'Legal' | 'Viewer' | 'Guest'

type OpportunityRow = {
  id: string
  name: string
  program: string
  submissions: number
  works: number
  decided: number
  accepted: number
  waitlisted: number
  declined: number
  reviewsComplete: number
  reviewsTotal: number
  partialSubmissions: number
}

type MonthRow = {
  month: string
  submissions: number
  previous: number | null
}

type TaxonomyRow = {
  id: string
  label: string
  works: number
  deprecated?: boolean
}

type InsightData = {
  organization: string
  role: Role
  range: string
  scope: string
  comparable: boolean
  comparisonLabel: string
  timezoneReady: boolean
  restricted: boolean
  loading?: boolean
  error?: boolean
  offline?: boolean
  exportAllowed: boolean
  opportunities: OpportunityRow[]
  months: MonthRow[]
  completeOutcomeDays: number[]
  taxonomy: TaxonomyRow[]
  missingDates: number
  excludedFromOutcomeTime: number
  suppressedSensitive: boolean
  note?: string
}

const directions: Array<{ id: Direction; number: string; name: string; description: string }> = [
  {
    id: 'brief',
    number: '01',
    name: 'Operating brief',
    description: 'A concise narrative review for occasional and executive readers.',
  },
  {
    id: 'program',
    number: '02',
    name: 'Program lens',
    description: 'Scope-first intake, review, Work outcomes, and operational attention.',
  },
  {
    id: 'analysis',
    number: '03',
    name: 'Analysis table',
    description: 'A dense comparative view for large portfolios and export preparation.',
  },
]

const fixtures: Array<{ value: Fixture; label: string }> = [
  { value: 'healthy', label: 'Healthy multi-Opportunity program' },
  { value: 'empty', label: 'First-use empty Organization' },
  { value: 'single', label: 'One Submission, no decisions' },
  { value: 'partial', label: 'Partially decided multi-Work packet' },
  { value: 'mixed', label: 'Mixed Work outcomes' },
  { value: 'reviews-empty', label: 'Assignments, no completed reviews' },
  { value: 'corrected', label: 'Decision corrected' },
  { value: 'imported', label: 'Imported records, missing dates' },
  { value: 'timezone', label: 'Organization timezone missing' },
  { value: 'incomparable', label: 'Previous period not comparable' },
  { value: 'large', label: 'Large portfolio' },
  { value: 'multi-taxonomy', label: 'Works with multiple practice terms' },
  { value: 'deprecated-taxonomy', label: 'Deprecated taxonomy term' },
  { value: 'small-sensitive', label: 'Sensitive slice below threshold' },
  { value: 'reviewer', label: 'Reviewer projection' },
  { value: 'finance', label: 'Finance projection, no currency ledger' },
  { value: 'legal', label: 'Legal projection, consent metadata absent' },
  { value: 'viewer', label: 'Viewer read-only projection' },
  { value: 'restricted-program', label: 'Program manager restricted scope' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Recoverable data error' },
  { value: 'offline', label: 'Offline' },
  { value: 'export-denied', label: 'Export permission denied' },
  { value: 'guest', label: 'Guest denied' },
]

const baseOpportunities: OpportunityRow[] = [
  {
    id: 'open-studio',
    name: 'Open Studio Fellowship',
    program: 'Artist development',
    submissions: 126,
    works: 151,
    decided: 112,
    accepted: 24,
    waitlisted: 13,
    declined: 75,
    reviewsComplete: 212,
    reviewsTotal: 238,
    partialSubmissions: 8,
  },
  {
    id: 'new-voices',
    name: 'New Voices Residency',
    program: 'Residencies',
    submissions: 74,
    works: 81,
    decided: 58,
    accepted: 12,
    waitlisted: 9,
    declined: 37,
    reviewsComplete: 111,
    reviewsTotal: 148,
    partialSubmissions: 6,
  },
  {
    id: 'public-art',
    name: 'Public Art Writing Commission',
    program: 'Commissions',
    submissions: 44,
    works: 55,
    decided: 46,
    accepted: 8,
    waitlisted: 4,
    declined: 34,
    reviewsComplete: 82,
    reviewsTotal: 86,
    partialSubmissions: 2,
  },
]

const baseMonths: MonthRow[] = [
  { month: 'Mar', submissions: 29, previous: 24 },
  { month: 'Apr', submissions: 38, previous: 34 },
  { month: 'May', submissions: 42, previous: 37 },
  { month: 'Jun', submissions: 47, previous: 41 },
  { month: 'Jul', submissions: 49, previous: 45 },
  { month: 'Aug', submissions: 39, previous: 37 },
]

const baseTaxonomy: TaxonomyRow[] = [
  { id: 'practice-literature-fiction', label: 'Fiction', works: 82 },
  { id: 'practice-literature-poetry', label: 'Poetry', works: 67 },
  { id: 'practice-literature-essay', label: 'Essay', works: 46 },
  { id: 'practice-visual-arts', label: 'Visual arts', works: 31 },
  { id: 'practice-performance', label: 'Performance', works: 19 },
]

function fixtureData(fixture: Fixture): InsightData {
  const base: InsightData = {
    organization: 'Missa Arts Foundation',
    role: 'Owner',
    range: '1 Mar – 31 Aug 2026',
    scope: 'All Opportunities',
    comparable: true,
    comparisonLabel: 'Previous equivalent period',
    timezoneReady: true,
    restricted: false,
    exportAllowed: true,
    opportunities: baseOpportunities,
    months: baseMonths,
    completeOutcomeDays: [8, 11, 13, 15, 17, 19],
    taxonomy: baseTaxonomy,
    missingDates: 0,
    excludedFromOutcomeTime: 16,
    suppressedSensitive: false,
  }

  if (fixture === 'empty') return { ...base, opportunities: [], months: [], completeOutcomeDays: [], taxonomy: [] }
  if (fixture === 'single') {
    return {
      ...base,
      opportunities: [{ ...baseOpportunities[0]!, submissions: 1, works: 2, decided: 0, accepted: 0, waitlisted: 0, declined: 0, reviewsComplete: 0, reviewsTotal: 0, partialSubmissions: 0 }],
      months: [{ month: 'Aug', submissions: 1, previous: 0 }],
      completeOutcomeDays: [],
      taxonomy: [{ id: 'practice-literature-fiction', label: 'Fiction', works: 1 }],
      excludedFromOutcomeTime: 1,
    }
  }
  if (fixture === 'partial') {
    return {
      ...base,
      opportunities: [{ ...baseOpportunities[0]!, submissions: 1, works: 3, decided: 1, accepted: 1, waitlisted: 0, declined: 0, reviewsComplete: 2, reviewsTotal: 3, partialSubmissions: 1 }],
      months: [{ month: 'Aug', submissions: 1, previous: 1 }],
      completeOutcomeDays: [],
      taxonomy: [{ id: 'practice-literature-fiction', label: 'Fiction', works: 2 }, { id: 'practice-literature-poetry', label: 'Poetry', works: 2 }],
      excludedFromOutcomeTime: 1,
      note: 'This Submission has three Works. One has a decision; the packet is excluded from complete-outcome time.',
    }
  }
  if (fixture === 'mixed') {
    return {
      ...base,
      opportunities: [{ ...baseOpportunities[0]!, submissions: 1, works: 3, decided: 3, accepted: 1, waitlisted: 1, declined: 1, reviewsComplete: 3, reviewsTotal: 3, partialSubmissions: 0 }],
      months: [{ month: 'Aug', submissions: 1, previous: 0 }],
      completeOutcomeDays: [12],
      taxonomy: [{ id: 'practice-literature-fiction', label: 'Fiction', works: 2 }, { id: 'practice-literature-poetry', label: 'Poetry', works: 1 }],
      excludedFromOutcomeTime: 0,
      note: 'One Submission can contain accepted, waitlisted, and declined Works. The packet is not reduced to one outcome.',
    }
  }
  if (fixture === 'reviews-empty') {
    return { ...base, opportunities: baseOpportunities.map((row) => ({ ...row, reviewsComplete: 0 })), note: 'Assignments exist, but none has a completed recommendation.' }
  }
  if (fixture === 'corrected') {
    return { ...base, note: 'The visible outcome totals reflect current decisions. Historical decision activity requires a versioned event record before it can be charted.' }
  }
  if (fixture === 'imported') {
    return { ...base, missingDates: 18, months: baseMonths.slice(1), note: '18 imported Submissions are included in current totals but excluded from the intake trend because their submitted dates are missing.' }
  }
  if (fixture === 'timezone') {
    return { ...base, timezoneReady: false, comparable: false, note: 'Choose an Organization timezone before using date-bucketed trends or period comparisons.' }
  }
  if (fixture === 'incomparable') {
    return { ...base, comparable: false, comparisonLabel: 'Comparison unavailable', note: 'The previous period used a different scope, duration, or metric definition.' }
  }
  if (fixture === 'large') {
    return {
      ...base,
      opportunities: baseOpportunities.map((row, index) => ({
        ...row,
        submissions: row.submissions * 98 + index * 17,
        works: row.works * 101,
        decided: row.decided * 96,
        accepted: row.accepted * 96,
        waitlisted: row.waitlisted * 96,
        declined: row.declined * 96,
        reviewsComplete: row.reviewsComplete * 90,
        reviewsTotal: row.reviewsTotal * 90,
        partialSubmissions: row.partialSubmissions * 88,
      })),
      months: baseMonths.map((row) => ({ ...row, submissions: row.submissions * 100, previous: (row.previous ?? 0) * 96 })),
      completeOutcomeDays: [8, 10, 11, 12, 14, 16, 19, 25],
      taxonomy: baseTaxonomy.map((row) => ({ ...row, works: row.works * 100 })),
      excludedFromOutcomeTime: 1408,
    }
  }
  if (fixture === 'multi-taxonomy') {
    return { ...base, taxonomy: [{ id: 'fiction', label: 'Fiction', works: 180 }, { id: 'poetry', label: 'Poetry', works: 141 }, { id: 'essay', label: 'Essay', works: 92 }], note: 'A Work can appear in more than one term row, so these counts do not add to the total number of Works.' }
  }
  if (fixture === 'deprecated-taxonomy') {
    return { ...base, taxonomy: [...baseTaxonomy, { id: 'legacy-intermedia', label: 'Intermedia', works: 7, deprecated: true }], note: 'Historical Works keep their recorded term. New classification uses the current practice taxonomy.' }
  }
  if (fixture === 'small-sensitive') {
    return { ...base, suppressedSensitive: true, note: 'This sensitive slice contains fewer than 10 records. Its values and complementary cells are withheld.' }
  }
  if (fixture === 'reviewer') return { ...base, role: 'Reviewer', restricted: true, scope: 'My review round', exportAllowed: false, note: 'Reviewer view shows your assignments and privacy-safe round context; other reviewers are not ranked or identified.' }
  if (fixture === 'finance') return { ...base, role: 'Finance', restricted: true, scope: 'Payment exceptions', note: 'Payment-state counts can be shown. Money totals remain unavailable until every record has a currency and ledger basis.' }
  if (fixture === 'legal') return { ...base, role: 'Legal', restricted: true, scope: 'Rights and consent', note: 'Consent and equity analytics remain unavailable until field purpose, consent, sensitivity, and retention metadata exist.' }
  if (fixture === 'viewer') return { ...base, role: 'Viewer', restricted: true, exportAllowed: false, note: 'Read-only aggregate view. Drill-down and export depend on separately granted capabilities.' }
  if (fixture === 'restricted-program') return { ...base, role: 'Program manager', restricted: true, scope: 'Artist development', opportunities: [baseOpportunities[0]!], months: baseMonths.map((row) => ({ ...row, submissions: Math.round(row.submissions * 0.52), previous: row.previous === null ? null : Math.round(row.previous * 0.52) })), note: 'The Program manager sees only Opportunities assigned to Artist development.' }
  if (fixture === 'loading') return { ...base, loading: true }
  if (fixture === 'error') return { ...base, error: true }
  if (fixture === 'offline') return { ...base, offline: true, exportAllowed: false }
  if (fixture === 'export-denied') return { ...base, exportAllowed: false, note: 'You can read this aggregate view, but your role does not include report export.' }
  if (fixture === 'guest') return { ...base, role: 'Guest', restricted: true, exportAllowed: false, opportunities: [], months: [], completeOutcomeDays: [], taxonomy: [], note: 'Guest access does not include Organization Insights.' }
  return base
}

function sum(rows: OpportunityRow[], key: keyof OpportunityRow) {
  return rows.reduce((total, row) => total + (typeof row[key] === 'number' ? row[key] : 0), 0)
}

function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null
}

function median(values: number[]) {
  if (!values.length) return null
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 === 0 ? (ordered[middle - 1]! + ordered[middle]!) / 2 : ordered[middle]!
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function countLabel(value: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`
}

const chartConfig = {
  submissions: { label: 'Submissions', color: '#5A3F68' },
  previous: { label: 'Previous period', color: '#B7A9BE' },
} satisfies ChartConfig

function MetricCard({ label, value, detail, footnote, tone = 'default' }: { label: string; value: string; detail: string; footnote: string; tone?: 'default' | 'attention' }) {
  return (
    <Card className={styles.metricCard} data-tone={tone}>
      <CardHeader className={styles.metricHeader}>
        <CardDescription>{label}</CardDescription>
        <Button variant="ghost" size="icon-sm" aria-label={`Definition for ${label}`} title={detail}>
          <Info aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className={styles.metricValue}>{value}</p>
        <p className={styles.metricDetail}>{detail}</p>
        <p className={styles.metricFootnote}>{footnote}</p>
      </CardContent>
    </Card>
  )
}

function ProgressLine({ label, value, total, detail }: { label: string; value: number; total: number; detail: string }) {
  const rate = percentage(value, total)
  return (
    <div className={styles.progressLine}>
      <div className={styles.progressCopy}>
        <div>
          <strong>{label}</strong>
          <span>{detail}</span>
        </div>
        <p><b>{rate === null ? '—' : `${rate}%`}</b><span>{formatNumber(value)} of {formatNumber(total)}</span></p>
      </div>
      <div className={styles.progressTrack} aria-label={`${label}: ${rate === null ? 'not available' : `${rate} percent`}`} role="img">
        <span style={{ width: `${rate ?? 0}%` }} />
      </div>
    </div>
  )
}

function DataNotice({ data }: { data: InsightData }) {
  if (!data.note && !data.offline && !data.suppressedSensitive) return null
  return (
    <Alert className={styles.notice}>
      {data.suppressedSensitive ? <ShieldAlert aria-hidden="true" /> : data.offline ? <AlertCircle aria-hidden="true" /> : <Info aria-hidden="true" />}
      <AlertTitle>{data.suppressedSensitive ? 'Sensitive slice withheld' : data.offline ? 'You are offline' : 'Read this result carefully'}</AlertTitle>
      <AlertDescription>{data.offline ? 'The structure is available, but figures are not shown from a saved copy. Reconnect to load the report.' : data.note}</AlertDescription>
    </Alert>
  )
}

function EmptyState({ guest = false }: { guest?: boolean }) {
  return (
    <section className={styles.emptyState} aria-labelledby="empty-title">
      <div className={styles.emptyIcon}><FileQuestion aria-hidden="true" /></div>
      <h2 id="empty-title">{guest ? 'Insights are not included in Guest access' : 'No activity to review yet'}</h2>
      <p>{guest ? 'Ask an Organization owner for an appropriate role if you need aggregate reporting.' : 'Insights will begin with the first submitted entry. Empty values are not interpreted as zero performance.'}</p>
      <Button variant="outline">{guest ? 'Return to Organization' : 'View Opportunities'}</Button>
    </section>
  )
}

function LoadingState() {
  return (
    <div className={styles.loading} aria-busy="true" aria-label="Loading Organization Insights">
      <div className={styles.loadingRow}>{[1, 2, 3].map((item) => <span key={item} />)}</div>
      <div className={styles.loadingPanel} />
      <div className={styles.loadingPanel} />
    </div>
  )
}

function ErrorState() {
  return (
    <Alert variant="destructive" className={styles.errorState}>
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Insights could not be loaded</AlertTitle>
      <AlertDescription>Nothing was changed. Try again, or return to the Organization overview.</AlertDescription>
      <div className={styles.alertActions}>
        <Button size="sm"><RotateCcw aria-hidden="true" />Try again</Button>
        <Button size="sm" variant="outline">Organization overview</Button>
      </div>
    </Alert>
  )
}

function IntakeChart({ data }: { data: InsightData }) {
  const chartData = data.timezoneReady ? data.months : []
  return (
    <Card className={styles.panel}>
      <CardHeader className={styles.panelHeader}>
        <div>
          <CardTitle>Intake over time</CardTitle>
          <CardDescription>Submissions grouped by submitted date in the selected scope.</CardDescription>
        </div>
        <Badge variant="outline">Submission grain</Badge>
      </CardHeader>
      <CardContent>
        {!data.timezoneReady ? (
          <Alert className={styles.inlineAlert}>
            <CalendarRange aria-hidden="true" />
            <AlertTitle>Timezone required</AlertTitle>
            <AlertDescription>Set an Organization timezone before using monthly buckets or period comparison.</AlertDescription>
          </Alert>
        ) : chartData.length ? (
          <>
            <ChartContainer config={chartConfig} className={styles.chart}>
              <BarChart accessibilityLayer data={chartData} margin={{ left: -14, right: 4, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={38} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                {data.comparable ? <Bar dataKey="previous" fill="var(--color-previous)" radius={[4, 4, 0, 0]} isAnimationActive={false} /> : null}
                <Bar dataKey="submissions" fill="var(--color-submissions)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
            <details className={styles.dataDetails}>
              <summary>View intake data table</summary>
              <div className={styles.tableScroller}>
                <table>
                  <caption className="sr-only">Submission intake by month</caption>
                  <thead><tr><th scope="col">Month</th><th scope="col">Selected period</th>{data.comparable ? <th scope="col">Previous period</th> : null}</tr></thead>
                  <tbody>{chartData.map((row) => <tr key={row.month}><th scope="row">{row.month}</th><td>{formatNumber(row.submissions)}</td>{data.comparable ? <td>{row.previous === null ? '—' : formatNumber(row.previous)}</td> : null}</tr>)}</tbody>
                </table>
              </div>
            </details>
          </>
        ) : <p className={styles.panelEmpty}>No dated Submissions are available in this scope.</p>}
      </CardContent>
    </Card>
  )
}

function ReviewDecisionPanel({ data }: { data: InsightData }) {
  const works = sum(data.opportunities, 'works')
  const decided = sum(data.opportunities, 'decided')
  const reviewsComplete = sum(data.opportunities, 'reviewsComplete')
  const reviewsTotal = sum(data.opportunities, 'reviewsTotal')
  const partial = sum(data.opportunities, 'partialSubmissions')
  const accepted = sum(data.opportunities, 'accepted')
  const waitlisted = sum(data.opportunities, 'waitlisted')
  const declined = sum(data.opportunities, 'declined')
  return (
    <Card className={styles.panel}>
      <CardHeader className={styles.panelHeader}>
        <div>
          <CardTitle>Reviews and Work decisions</CardTitle>
          <CardDescription>Current workflow state; corrections replace the visible Work outcome.</CardDescription>
        </div>
        <Badge variant="outline">Mixed grains named</Badge>
      </CardHeader>
      <CardContent className={styles.reviewBody}>
        <ProgressLine label="Review completion" value={reviewsComplete} total={reviewsTotal} detail="Completed assignments in this scope" />
        <ProgressLine label="Decided Works" value={decided} total={works} detail="Works with a current outcome" />
        <div className={styles.outcomeGrid}>
          <div><span className={styles.dot} data-tone="positive" /><p><b>{formatNumber(accepted)}</b>Accepted Works</p></div>
          <div><span className={styles.dot} data-tone="attention" /><p><b>{formatNumber(waitlisted)}</b>Waitlisted Works</p></div>
          <div><span className={styles.dot} data-tone="neutral" /><p><b>{formatNumber(declined)}</b>Declined Works</p></div>
          <div><span className={styles.dot} data-tone="mineral" /><p><b>{formatNumber(Math.max(works - decided, 0))}</b>Undecided Works</p></div>
        </div>
        {partial > 0 ? <div className={styles.attentionRow}><CircleAlert aria-hidden="true" /><span><b>{countLabel(partial, 'partially decided Submission')}</b> {partial === 1 ? 'needs its' : 'need their'} remaining Works resolved.</span><Button variant="outline" size="sm">Review queue<ArrowRight aria-hidden="true" /></Button></div> : null}
      </CardContent>
    </Card>
  )
}

function OpportunityComparison({ data, dense = false }: { data: InsightData; dense?: boolean }) {
  return (
    <Card className={styles.panel}>
      <CardHeader className={styles.panelHeader}>
        <div>
          <CardTitle>{dense ? 'Portfolio analysis' : 'Where attention is needed'}</CardTitle>
          <CardDescription>Compare workflow coverage—not creative quality—across Opportunities.</CardDescription>
        </div>
        <Button variant="outline" size="sm"><SlidersHorizontal aria-hidden="true" />Columns</Button>
      </CardHeader>
      <CardContent className={styles.comparisonContent}>
        <div className={styles.tableScroller}>
          <table className={styles.comparisonTable}>
            <caption className="sr-only">Opportunity workflow comparison</caption>
            <thead>
              <tr><th scope="col">Opportunity</th><th scope="col">Submissions</th><th scope="col">Works</th><th scope="col">Decided</th><th scope="col">Reviews complete</th>{dense ? <><th scope="col">Accepted</th><th scope="col">Waitlisted</th><th scope="col">Declined</th></> : null}<th scope="col"><span className="sr-only">Open</span></th></tr>
            </thead>
            <tbody>
              {data.opportunities.map((row) => {
                const decisionCoverage = percentage(row.decided, row.works)
                const reviewCompletion = percentage(row.reviewsComplete, row.reviewsTotal)
                return (
                  <tr key={row.id}>
                    <th scope="row"><span>{row.name}</span><small>{row.program}</small></th>
                    <td>{formatNumber(row.submissions)}</td>
                    <td>{formatNumber(row.works)}</td>
                    <td><b>{decisionCoverage === null ? '—' : `${decisionCoverage}%`}</b><small>{formatNumber(row.decided)} of {formatNumber(row.works)}</small></td>
                    <td><b>{reviewCompletion === null ? '—' : `${reviewCompletion}%`}</b><small>{formatNumber(row.reviewsComplete)} of {formatNumber(row.reviewsTotal)}</small></td>
                    {dense ? <><td>{formatNumber(row.accepted)}</td><td>{formatNumber(row.waitlisted)}</td><td>{formatNumber(row.declined)}</td></> : null}
                    <td><Button variant="ghost" size="icon-sm" aria-label={`Open ${row.name}`}><ChevronRight aria-hidden="true" /></Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.mobileOpportunityList}>
          {data.opportunities.map((row) => (
            <article key={row.id} className={styles.mobileOpportunity}>
              <div><p>{row.name}</p><span>{row.program}</span></div>
              <dl>
                <div><dt>Submissions</dt><dd>{formatNumber(row.submissions)}</dd></div>
                <div><dt>Decided Works</dt><dd>{percentage(row.decided, row.works) ?? '—'}{row.works ? '%' : ''}</dd></div>
                <div><dt>Reviews complete</dt><dd>{percentage(row.reviewsComplete, row.reviewsTotal) ?? '—'}{row.reviewsTotal ? '%' : ''}</dd></div>
              </dl>
              <Button variant="outline">Open Opportunity<ChevronRight aria-hidden="true" /></Button>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TaxonomyPanel({ data }: { data: InsightData }) {
  return (
    <Card className={styles.panel}>
      <CardHeader className={styles.panelHeader}>
        <div>
          <CardTitle>Practice lens</CardTitle>
          <CardDescription>One independent facet at a time. A Work may appear in more than one row.</CardDescription>
        </div>
        <label className={styles.compactControl}>
          <span>Facet</span>
          <Select defaultValue="practice">
            <SelectTrigger aria-label="Practice facet"><SelectValue>{(value: string) => ({ practice: 'Practice', form: 'Form', discipline: 'Discipline' })[value] ?? value}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="practice">Practice</SelectItem><SelectItem value="form">Form</SelectItem><SelectItem value="discipline">Discipline</SelectItem></SelectContent>
          </Select>
        </label>
      </CardHeader>
      <CardContent>
        {data.suppressedSensitive ? (
          <div className={styles.suppressed}><LockKeyhole aria-hidden="true" /><div><b>Values withheld</b><p>Fewer than 10 records are available in this sensitive slice. Related cells are also withheld to prevent subtraction.</p></div></div>
        ) : data.taxonomy.length ? (
          <div className={styles.taxonomyList}>
            {data.taxonomy.map((row) => <div key={row.id}><span><b>{row.label}</b>{row.deprecated ? <Badge variant="outline">Historical term</Badge> : null}</span><p>{formatNumber(row.works)} <small>Works tagged</small></p></div>)}
          </div>
        ) : <p className={styles.panelEmpty}>No practice terms are recorded in this scope.</p>}
        <p className={styles.nonAdditive}><Info aria-hidden="true" />These rows are non-additive. Practice does not determine eligibility, geography, outcome, or quality.</p>
      </CardContent>
    </Card>
  )
}

function QualityPanel({ data }: { data: InsightData }) {
  const issues = [
    data.missingDates ? `${formatNumber(data.missingDates)} records excluded from the intake trend because their submitted date is missing.` : 'All records used in the intake trend have a submitted date.',
    data.excludedFromOutcomeTime ? `${formatNumber(data.excludedFromOutcomeTime)} Submissions excluded from outcome time because not every Work has a decision.` : 'No partially decided Submission was used in complete-outcome time.',
    data.comparable ? 'The previous period uses the same duration, scope, timezone, and metric definition.' : 'Period comparison is withheld because the periods are not equivalent.',
  ]
  return (
    <Card className={styles.qualityPanel}>
      <CardHeader><CardTitle>What this report does not hide</CardTitle><CardDescription>Exclusions and unavailable analyses remain part of the report.</CardDescription></CardHeader>
      <CardContent className={styles.qualityGrid}>
        <ul>{issues.map((issue, index) => <li key={issue}>{index === 0 && !data.missingDates ? <Check aria-hidden="true" /> : index === 2 && data.comparable ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}<span>{issue}</span></li>)}</ul>
        <div className={styles.unavailable}>
          <p><b>Not available yet</b><Badge variant="outline">Protected</Badge></p>
          <span>Views-to-draft funnel, demographic analysis, currency totals, reviewer ranking, and fulfillment proof are not inferred from incomplete data.</span>
        </div>
      </CardContent>
    </Card>
  )
}

function PrimaryMetrics({ data }: { data: InsightData }) {
  const submissions = sum(data.opportunities, 'submissions')
  const works = sum(data.opportunities, 'works')
  const decided = sum(data.opportunities, 'decided')
  const coverage = percentage(decided, works)
  const medianDays = median(data.completeOutcomeDays)
  const previous = data.months.reduce((total, row) => total + (row.previous ?? 0), 0)
  const intakeComparison = data.comparable && previous ? `${submissions - previous >= 0 ? '+' : ''}${formatNumber(submissions - previous)} versus previous period` : 'Comparison not shown'
  return (
    <section className={styles.metrics} aria-label="Primary measures">
      <MetricCard label="Submissions received" value={formatNumber(submissions)} detail="Submission grain · received in this period" footnote={intakeComparison} />
      <MetricCard label="Decided Works coverage" value={coverage === null ? '—' : `${coverage}%`} detail={`${formatNumber(decided)} of ${formatNumber(works)} Works have a current decision`} footnote={`${countLabel(Math.max(works - decided, 0), 'Work')} ${works - decided === 1 ? 'remains' : 'remain'} undecided`} tone={coverage !== null && coverage < 70 ? 'attention' : 'default'} />
      <MetricCard label="Median complete-outcome time" value={medianDays === null ? '—' : `${medianDays} days`} detail="Only fully decided Submissions" footnote={data.excludedFromOutcomeTime ? `${countLabel(data.excludedFromOutcomeTime, 'partial packet')} excluded` : 'No partial packets excluded'} />
    </section>
  )
}

function OperatingBrief({ data }: { data: InsightData }) {
  const works = sum(data.opportunities, 'works')
  const decided = sum(data.opportunities, 'decided')
  const reviewsComplete = sum(data.opportunities, 'reviewsComplete')
  const reviewsTotal = sum(data.opportunities, 'reviewsTotal')
  return (
    <div className={styles.directionBody}>
      <PrimaryMetrics data={data} />
      <div className={styles.briefGrid}>
        <Card className={styles.briefNarrative}>
          <CardHeader><Badge>Operating brief</Badge><CardTitle>Intake is steady; two workflow gaps need attention.</CardTitle></CardHeader>
          <CardContent>
            <p>{formatNumber(Math.max(works - decided, 0))} Works do not yet have a decision, and {formatNumber(Math.max(reviewsTotal - reviewsComplete, 0))} review assignments remain incomplete. These are workload signals, not judgements about the quality of submissions or reviewers.</p>
            <div className={styles.briefActions}><Button>Open review queue<ArrowRight aria-hidden="true" /></Button><Button variant="outline">View definitions</Button></div>
          </CardContent>
        </Card>
        <IntakeChart data={data} />
      </div>
      <OpportunityComparison data={data} />
      <QualityPanel data={data} />
    </div>
  )
}

function ProgramLens({ data }: { data: InsightData }) {
  return (
    <div className={styles.directionBody}>
      <PrimaryMetrics data={data} />
      <div className={styles.programGrid}><IntakeChart data={data} /><ReviewDecisionPanel data={data} /></div>
      <OpportunityComparison data={data} />
      <div className={styles.bottomGrid}><TaxonomyPanel data={data} /><QualityPanel data={data} /></div>
    </div>
  )
}

function AnalysisTable({ data }: { data: InsightData }) {
  return (
    <div className={styles.directionBody}>
      <PrimaryMetrics data={data} />
      <OpportunityComparison data={data} dense />
      <div className={styles.bottomGrid}><TaxonomyPanel data={data} /><QualityPanel data={data} /></div>
    </div>
  )
}

function OrganizationInsightsExperience({ selectedOnly }: { selectedOnly: boolean }) {
  const [direction, setDirection] = useState<Direction>('program')
  const [fixture, setFixture] = useState<Fixture>('healthy')
  const [definitionsOpen, setDefinitionsOpen] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const data = useMemo(() => fixtureData(fixture), [fixture])
  const activeDirectionId: Direction = selectedOnly ? 'program' : direction
  const activeDirection = directions.find((item) => item.id === activeDirectionId) ?? directions[1]!

  function handleExport() {
    setExportMessage(data.exportAllowed ? 'Local preview only: a product export must apply the same scope, definitions, permission, and suppression rules.' : 'Export is not included in this role projection.')
  }

  return (
    <main className={styles.page}>
      <header className={styles.reviewHeader}>
        <div>
          <p className={styles.eyebrow}>Missa component library · local review</p>
          <h1>{selectedOnly ? 'Organization Insights · Program lens' : 'Organization Insights directions'}</h1>
          <p>{selectedOnly ? 'The selected scope-first composition, retained locally for page-by-page review.' : 'Three premium-informed compositions. Option 02 is selected; no product route, API, schema, or production data is changed.'}</p>
        </div>
        <Badge variant="outline">Promotion blocked</Badge>
      </header>

      <section className={styles.directionChooser} aria-labelledby="direction-heading">
        <div className={styles.chooserHeading}>
          <div><p className={styles.eyebrow}>{selectedOnly ? 'Selected composition' : 'Visual direction'}</p><h2 id="direction-heading">{selectedOnly ? '02 · Program lens' : 'Compare without losing the alternatives'}</h2></div>
          <label className={styles.fixtureControl}><span>Edge-case fixture</span><select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>{fixtures.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        {selectedOnly ? null : <div className={styles.directionOptions}>
          {directions.map((item) => (
            <button key={item.id} type="button" className={styles.directionOption} data-selected={activeDirectionId === item.id} onClick={() => setDirection(item.id)} aria-pressed={activeDirectionId === item.id}>
              <span>{item.number}</span><div><b>{item.name}</b><p>{item.description}</p></div>{activeDirectionId === item.id ? <Check aria-hidden="true" /> : null}
            </button>
          ))}
        </div>}
      </section>

      <section className={styles.screen} aria-label={`${activeDirection.name} preview`}>
        <nav className={styles.topbar} aria-label="Organization navigation">
          <a href="#insights" className={styles.wordmark}>MISSA</a>
          <div className={styles.organizationIdentity}><span>Organization</span><b>{data.organization}</b></div>
          <div className={styles.topLinks}><a href="#opportunities">Opportunities</a><a href="#submissions">Submissions</a><a href="#reviews">Reviews</a><a href="#insights" aria-current="page">Insights</a></div>
          <Button variant="ghost" size="icon" className={styles.menuButton} aria-label="Open Organization navigation"><Menu aria-hidden="true" /></Button>
          <div className={styles.roleChip}><UsersRound aria-hidden="true" /><span>{data.role}</span></div>
        </nav>

        <div className={styles.screenBody} id="insights">
          <header className={styles.pageHeader}>
            <div><p className={styles.crumb}>Organization <ChevronRight aria-hidden="true" /> Insights</p><h2>Insights</h2><p>Understand intake, review progress, and Work outcomes without flattening different records into one score.</p></div>
            <div className={styles.headerActions}><Button variant="outline" onClick={() => setDefinitionsOpen((value) => !value)}><BookOpen aria-hidden="true" />Metric definitions</Button><Button onClick={handleExport} disabled={!data.exportAllowed}><Download aria-hidden="true" />Export report</Button></div>
          </header>

          <section className={styles.scopeBar} aria-label="Insight scope">
            <label><span>Date range</span><Select key={`${fixture}-range`} defaultValue="six-months"><SelectTrigger><CalendarRange aria-hidden="true" /><SelectValue>{(value: string) => ({ 'six-months': 'Last 6 months', quarter: 'This quarter', year: 'This year' })[value] ?? value}</SelectValue></SelectTrigger><SelectContent><SelectItem value="six-months">Last 6 months</SelectItem><SelectItem value="quarter">This quarter</SelectItem><SelectItem value="year">This year</SelectItem></SelectContent></Select></label>
            <label><span>Scope</span><Select key={`${fixture}-scope`} defaultValue="all"><SelectTrigger><Layers3 aria-hidden="true" /><SelectValue>{(value: string) => ({ all: data.scope, 'artist-development': 'Artist development', 'open-studio': 'Open Studio Fellowship' })[value] ?? value}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">{data.scope}</SelectItem><SelectItem value="artist-development">Artist development</SelectItem><SelectItem value="open-studio">Open Studio Fellowship</SelectItem></SelectContent></Select></label>
            <label><span>Compare</span><Select key={`${fixture}-compare`} defaultValue={data.comparable ? 'previous' : 'none'} disabled={!data.comparable}><SelectTrigger><BarChart3 aria-hidden="true" /><SelectValue>{(value: string) => ({ previous: 'Previous period', none: 'No comparison' })[value] ?? value}</SelectValue></SelectTrigger><SelectContent><SelectItem value="previous">Previous period</SelectItem><SelectItem value="none">No comparison</SelectItem></SelectContent></Select></label>
            <div className={styles.scopeSummary}><Filter aria-hidden="true" /><p><b>{data.range}</b><span>{data.scope}{data.restricted ? ' · Restricted projection' : ''}</span></p></div>
          </section>

          {definitionsOpen ? <Alert className={styles.definitionPanel}><Info aria-hidden="true" /><AlertTitle>Definitions stay with the report</AlertTitle><AlertDescription><b>Submission</b> is one submitted packet. <b>Work</b> is one creative item inside it. Decision coverage is decided Works divided by Works received. Complete-outcome time includes only Submissions where every Work has a decision.</AlertDescription></Alert> : null}
          {exportMessage ? <Alert className={styles.definitionPanel}><Download aria-hidden="true" /><AlertTitle>Export status</AlertTitle><AlertDescription>{exportMessage}</AlertDescription></Alert> : null}
          <DataNotice data={data} />

          {data.loading ? <LoadingState /> : data.error ? <ErrorState /> : data.role === 'Guest' ? <EmptyState guest /> : data.offline ? <QualityPanel data={data} /> : !data.opportunities.length ? <EmptyState /> : activeDirectionId === 'brief' ? <OperatingBrief data={data} /> : activeDirectionId === 'analysis' ? <AnalysisTable data={data} /> : <ProgramLens data={data} />}
        </div>
      </section>
    </main>
  )
}

export function OrganizationInsightsDirections() {
  return <OrganizationInsightsExperience selectedOnly={false} />
}

export function OrganizationInsightsSelected() {
  return <OrganizationInsightsExperience selectedOnly />
}
