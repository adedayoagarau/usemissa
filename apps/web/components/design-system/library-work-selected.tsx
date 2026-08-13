'use client'

import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  ChevronDown,
  Copy,
  Download,
  Ellipsis,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Filter,
  FolderOpen,
  History,
  ImageOff,
  Inbox,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Tags,
  Upload,
} from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { MissaWordmark } from '@/components/missa-wordmark'
import styles from './library-work-selected.module.css'

type LibraryView = 'works' | 'files' | 'answers'
type Fixture = 'normal' | 'empty' | 'multi' | 'deprecated' | 'version' | 'missing' | 'privacy' | 'large'
type DetailView = 'overview' | 'files' | 'taxonomy' | 'history'

type Work = {
  id: string
  title: string
  description: string
  image?: string
  primaryFile: string
  medium: string
  terms: string[]
  updated: string
  files: number
  versions: number
  active: number
  submitted: number
  currentVersion: string
  note?: string
}

type LibraryFile = {
  id: string
  name: string
  kind: 'image' | 'pdf' | 'audio' | 'video'
  size: string
  linkedTo: string
  updated: string
  state?: 'available' | 'missing'
}

type SavedAnswer = {
  id: string
  name: string
  excerpt: string
  count: string
  used: string
  updated: string
}

const baseWorks: Work[] = [
  {
    id: 'saltwater',
    title: 'Saltwater Lessons',
    description: 'A linked essay cycle about memory, coastlines, and the stories a family keeps revising.',
    image: '/media/home/portfolio-still-life.webp',
    primaryFile: 'saltwater-lessons-v3.pdf',
    medium: 'Writing · Creative nonfiction',
    terms: ['Essay', 'Memoir', 'English'],
    updated: '7 Aug 2026',
    files: 4,
    versions: 3,
    active: 2,
    submitted: 5,
    currentVersion: 'Version 3 · 7 Aug 2026',
  },
  {
    id: 'harmattan',
    title: 'After the Harmattan',
    description: 'A photographic and sound study of dust, movement, and seasonal memory.',
    image: '/media/home/artist-at-work.webp',
    primaryFile: 'harmattan-field-recording-02.wav',
    medium: 'Photography · Sound',
    terms: ['Documentary', 'Field recording', 'Environment'],
    updated: '28 Jul 2026',
    files: 7,
    versions: 2,
    active: 1,
    submitted: 3,
    currentVersion: 'Version 2 · 28 Jul 2026',
  },
  {
    id: 'borrowed-ground',
    title: 'Borrowed Ground',
    description: 'An installation proposal using found materials, oral histories, and projected text.',
    image: '/media/home/gallery-interior.webp',
    primaryFile: 'borrowed-ground-walkthrough.mp4',
    medium: 'Installation · Moving image',
    terms: ['Site-specific', 'Oral history', 'Projection'],
    updated: '19 Jul 2026',
    files: 5,
    versions: 4,
    active: 3,
    submitted: 2,
    currentVersion: 'Version 4 · 19 Jul 2026',
  },
  {
    id: 'blue-room',
    title: 'Notes from the Blue Room',
    description: 'Early notes, fragments, and reference material for a new performance work.',
    primaryFile: 'blue-room-notes-v1.pdf',
    medium: 'Performance · Research',
    terms: ['Performance', 'Archive', 'In development'],
    updated: '2 Jun 2026',
    files: 2,
    versions: 1,
    active: 0,
    submitted: 0,
    currentVersion: 'Version 1 · 2 Jun 2026',
  },
]

const files: LibraryFile[] = [
  { id: 'manuscript', name: 'saltwater-lessons-v3.pdf', kind: 'pdf', size: '1.8 MB', linkedTo: 'Saltwater Lessons · Version 3', updated: '7 Aug 2026' },
  { id: 'cover', name: 'saltwater-cover-final.jpg', kind: 'image', size: '4.2 MB', linkedTo: 'Saltwater Lessons · Version 3', updated: '7 Aug 2026' },
  { id: 'audio', name: 'harmattan-field-recording-02.wav', kind: 'audio', size: '84.6 MB', linkedTo: 'After the Harmattan · Version 2', updated: '28 Jul 2026' },
  { id: 'video', name: 'borrowed-ground-walkthrough.mp4', kind: 'video', size: '96.1 MB', linkedTo: 'Borrowed Ground · Version 4', updated: '19 Jul 2026' },
]

const answers: SavedAnswer[] = [
  { id: 'bio', name: 'Short biography · 100 words', excerpt: 'Adedayo Agarau is a poet and multidisciplinary artist whose work considers memory, migration, and place…', count: '94 words', used: 'Used in 8 submissions', updated: '5 Aug 2026' },
  { id: 'practice', name: 'Artist statement · general', excerpt: 'My work moves between writing, image, sound, and collaborative forms. I begin with the archive as a living…', count: '286 words', used: 'Used in 4 submissions', updated: '22 Jul 2026' },
  { id: 'access', name: 'Access requirements', excerpt: 'For in-person programmes I need step-free access, a quiet workspace, and advance notice of travel changes…', count: '63 words', used: 'Used in 2 submissions', updated: '11 Jul 2026' },
]

const fixtureLabels: Record<Fixture, string> = {
  normal: 'Active Library',
  empty: 'First-use empty',
  multi: 'Multi-medium Work',
  deprecated: 'Deprecated taxonomy',
  version: 'Current differs from submitted',
  missing: 'Missing file',
  privacy: 'Private/public conflict',
  large: 'Large Library',
}

function AppHeader() {
  return (
    <header className={styles.appHeader}>
      <MissaWordmark href='#library-content' size='app' className={styles.wordmark} />
      <nav aria-label='Primary navigation'>
        <a href='#'>Opportunities</a>
        <a href='#'>Tracker</a>
        <a href='#' aria-current='page'>Library</a>
      </nav>
      <div className={styles.headerActions}>
        <Button type='button' variant='ghost' size='icon' aria-label='Open Inbox'><Inbox aria-hidden='true' /></Button>
        <Button type='button' variant='ghost' size='icon' className={styles.mobileMenu} aria-label='Open navigation'><Menu aria-hidden='true' /></Button>
        <button type='button' className={styles.avatar} aria-label='Open Profile'>A</button>
      </div>
    </header>
  )
}

function ReviewBar({ fixture, setFixture }: { fixture: Fixture; setFixture: (fixture: Fixture) => void }) {
  return (
    <div className={styles.reviewBar} aria-label='Design review controls'>
      <div>
        <strong>Selected · Option 2</strong>
        <span>Working Archive</span>
      </div>
      <label>
        <span>Edge state</span>
        <select value={fixture} onChange={(event) => setFixture(event.target.value as Fixture)}>
          {(Object.keys(fixtureLabels) as Fixture[]).map((key) => <option key={key} value={key}>{fixtureLabels[key]}</option>)}
        </select>
      </label>
    </div>
  )
}

function FileIcon({ kind }: { kind: LibraryFile['kind'] }) {
  if (kind === 'image') return <FileImage aria-hidden='true' />
  if (kind === 'audio') return <FileAudio aria-hidden='true' />
  if (kind === 'video') return <FileVideo aria-hidden='true' />
  return <FileText aria-hidden='true' />
}

function StateNotice({ fixture }: { fixture: Fixture }) {
  if (fixture === 'deprecated') {
    return (
      <Alert className={styles.notice}>
        <Tags aria-hidden='true' />
        <AlertTitle>One field term has been updated</AlertTitle>
        <AlertDescription>“Documentary arts” remains on a submitted version. Review the suggested current term before changing the active Work.</AlertDescription>
      </Alert>
    )
  }
  if (fixture === 'version') {
    return (
      <Alert className={styles.notice}>
        <History aria-hidden='true' />
        <AlertTitle>The current Work is newer than the submitted copy</AlertTitle>
        <AlertDescription>North River Review received Version 2. Your active Work is Version 3. The submission snapshot will not be rewritten.</AlertDescription>
      </Alert>
    )
  }
  if (fixture === 'missing') {
    return (
      <Alert variant='destructive' className={styles.notice}>
        <ImageOff aria-hidden='true' />
        <AlertTitle>One file is unavailable</AlertTitle>
        <AlertDescription>The historical filename and submission link are preserved. Uploading a replacement will create a new Work version.</AlertDescription>
      </Alert>
    )
  }
  if (fixture === 'privacy') {
    return (
      <Alert variant='destructive' className={styles.notice}>
        <ShieldCheck aria-hidden='true' />
        <AlertTitle>Public Profile details no longer match this private Work</AlertTitle>
        <AlertDescription>Your public preview is still based on Version 2. Review exactly what is public before publishing Version 3.</AlertDescription>
      </Alert>
    )
  }
  return null
}

function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
  return (
    <section className={styles.emptyState} aria-labelledby='empty-title'>
      <FolderOpen aria-hidden='true' />
      <p className={styles.eyebrow}>Private by default</p>
      <h2 id='empty-title'>Begin with a Work, not a folder</h2>
      <p>A Work keeps the files, versions, field terms, and submission history for one creative project together.</p>
      <div>
        <Button type='button' onClick={onCreate}><Plus aria-hidden='true' />Create your first Work</Button>
        <Button type='button' variant='outline'><Upload aria-hidden='true' />Upload files first</Button>
      </div>
    </section>
  )
}

function WorkRow({ work, selected, onOpen }: { work: Work; selected: boolean; onOpen: (work: Work) => void }) {
  return (
    <article className={styles.workRow} data-selected={selected}>
      <div className={styles.workMedia}>
        {work.image ? <Image src={work.image} alt='' fill sizes='96px' /> : <span aria-hidden='true'>{work.title.slice(0, 1)}</span>}
      </div>
      <div className={styles.workIdentity}>
        <p>{work.medium}</p>
        <h2>{work.title}</h2>
        <p>{work.description}</p>
        <div className={styles.termList} aria-label={`Field terms for ${work.title}`}>
          {work.terms.slice(0, 3).map((term) => <Badge key={term} variant='secondary'>{term}</Badge>)}
        </div>
      </div>
      <dl className={styles.workFacts}>
        <div><dt>Current</dt><dd>{work.currentVersion}</dd></div>
        <div><dt>Material</dt><dd>{work.files} files · {work.versions} versions</dd></div>
        <div><dt>Use</dt><dd>{work.active} active · {work.submitted} submitted</dd></div>
      </dl>
      <div className={styles.rowActions}>
        <Button type='button' variant={selected ? 'secondary' : 'outline'} onClick={() => onOpen(work)}>
          {selected ? 'Open' : 'Open Work'}<ArrowRight aria-hidden='true' />
        </Button>
        <Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${work.title}`}><Ellipsis aria-hidden='true' /></Button>
      </div>
    </article>
  )
}

function FileRow({ file, onOpen }: { file: LibraryFile; onOpen: (label: string) => void }) {
  return (
    <article className={styles.resourceRow} data-state={file.state ?? 'available'}>
      <span className={styles.resourceIcon}><FileIcon kind={file.kind} /></span>
      <div><h2>{file.name}{file.state === 'missing' ? <Badge variant='destructive'>Unavailable</Badge> : null}</h2><p>{file.state === 'missing' ? 'Historical reference preserved · bytes unavailable' : file.linkedTo}</p></div>
      <dl><div><dt>Size</dt><dd>{file.size}</dd></div><div><dt>Added</dt><dd>{file.updated}</dd></div></dl>
      <div className={styles.rowActions}>
        <Button type='button' variant='outline' onClick={() => onOpen(file.state === 'missing' ? `Recovery options opened for ${file.name}.` : `Preview opened for ${file.name}.`)}>{file.state === 'missing' ? 'Review' : 'Preview'}</Button>
        <Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${file.name}`}><Ellipsis aria-hidden='true' /></Button>
      </div>
    </article>
  )
}

function AnswerRow({ answer, onCopy }: { answer: SavedAnswer; onCopy: (answer: SavedAnswer) => void }) {
  return (
    <article className={styles.answerRow}>
      <span className={styles.resourceIcon}><BookOpenText aria-hidden='true' /></span>
      <div><h2>{answer.name}</h2><p>{answer.excerpt}</p><span>{answer.count} · {answer.used} · Updated {answer.updated}</span></div>
      <div className={styles.rowActions}>
        <Button type='button' variant='outline'>Open</Button>
        <Button type='button' variant='ghost' size='icon' aria-label={`Copy ${answer.name}`} onClick={() => onCopy(answer)}><Copy aria-hidden='true' /></Button>
      </div>
    </article>
  )
}

function WorkDetail({ work, fixture, detailView, setDetailView, onClose, onStatus }: {
  work: Work
  fixture: Fixture
  detailView: DetailView
  setDetailView: (view: DetailView) => void
  onClose: () => void
  onStatus: (message: string) => void
}) {
  const history = [
    { date: '7 Aug 2026', title: 'Version 3 marked current', detail: 'Manuscript and cover image updated.' },
    { date: '18 Jul 2026', title: 'Version 2 submitted', detail: 'North River Review · receipt preserved.' },
    { date: '3 Jun 2026', title: 'Version 1 created', detail: 'Initial manuscript and description.' },
  ]
  return (
    <aside className={styles.detailPanel} aria-label={`Work detail for ${work.title}`}>
      <div className={styles.detailTopbar}>
        <Button type='button' variant='ghost' onClick={onClose}><ArrowLeft aria-hidden='true' />Back to Library</Button>
        <Button type='button' variant='ghost' size='icon' aria-label={`More actions for ${work.title}`}><Ellipsis aria-hidden='true' /></Button>
      </div>
      <div className={styles.detailHero}>
        <div className={styles.detailImage}>{work.image ? <Image src={work.image} alt='' fill sizes='(max-width: 800px) 100vw, 420px' /> : <span aria-hidden='true'>{work.title.slice(0, 1)}</span>}</div>
        <div>
          <p className={styles.eyebrow}>Private Work</p>
          <h2>{work.title}</h2>
          <p>{work.description}</p>
          <div className={styles.detailActions}>
            <Button type='button' onClick={() => onStatus(`A new version flow opened for ${work.title}.`)}><Upload aria-hidden='true' />Add version</Button>
            <Button type='button' variant='outline'>Edit details</Button>
          </div>
        </div>
      </div>
      <nav className={styles.detailNav} aria-label='Work detail views'>
        {(['overview', 'files', 'taxonomy', 'history'] as DetailView[]).map((view) => (
          <button key={view} type='button' aria-current={detailView === view ? 'page' : undefined} onClick={() => setDetailView(view)}>{view[0]!.toUpperCase() + view.slice(1)}</button>
        ))}
      </nav>
      {detailView === 'overview' ? (
        <div className={styles.detailBody}>
          {(fixture === 'version' || fixture === 'missing' || fixture === 'privacy') ? <StateNotice fixture={fixture} /> : null}
          <section>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Current material</p><h3>{work.currentVersion}</h3></div><Button type='button' variant='ghost'>View all files</Button></div>
            <div className={styles.currentFile}>
              <span><FileText aria-hidden='true' /></span>
              <div><strong>{work.primaryFile}</strong><p>Current file · {work.currentVersion}</p></div>
              <Button type='button' variant='outline' size='icon' aria-label={`Download ${work.primaryFile}`}><Download aria-hidden='true' /></Button>
            </div>
          </section>
          <section className={styles.detailGrid}>
            <div><p className={styles.eyebrow}>Tracker</p><strong>{work.active} active opportunities</strong><p>Preparation stays in Tracker; this Work only shows the connection.</p><Button type='button' variant='link'>View in Tracker <ArrowRight aria-hidden='true' /></Button></div>
            <div><p className={styles.eyebrow}>Submission history</p><strong>{work.submitted} submitted uses</strong><p>Each record keeps the exact Work version that was sent.</p><Button type='button' variant='link'>View history <ArrowRight aria-hidden='true' /></Button></div>
          </section>
          <section>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Field</p><h3>Canonical terms by facet</h3></div><Button type='button' variant='outline'>Edit terms</Button></div>
            <dl className={styles.taxonomyList}>
              <div><dt>Discipline</dt><dd>Literature</dd></div>
              <div><dt>Form</dt><dd>Essay · Memoir</dd></div>
              <div><dt>Theme</dt><dd>Memory · Place · Family</dd></div>
              <div><dt>Language</dt><dd>English</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
      {detailView === 'files' ? (
        <div className={styles.detailBody}><section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Versions and files</p><h3>3 versions · 4 files</h3></div><Button type='button'><Plus aria-hidden='true' />Add version</Button></div>{files.slice(0, 3).map((file) => <FileRow key={file.id} file={fixture === 'missing' && file.id === 'cover' ? { ...file, state: 'missing' } : file} onOpen={onStatus} />)}</section></div>
      ) : null}
      {detailView === 'taxonomy' ? (
        <div className={styles.detailBody}><section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>12 independent facets</p><h3>Describe the Work, not its eligibility</h3></div><Button type='button'>Edit terms</Button></div><dl className={styles.taxonomyList}><div><dt>Discipline</dt><dd>Literature</dd></div><div><dt>Form</dt><dd>Essay · Memoir</dd></div><div><dt>Genre</dt><dd>Creative nonfiction</dd></div><div><dt>Medium</dt><dd>Text</dd></div><div><dt>Technique</dt><dd>Lyric essay</dd></div><div><dt>Theme</dt><dd>Memory · Place · Family</dd></div><div><dt>Language</dt><dd>English</dd></div><div><dt>Audience</dt><dd>Adult</dd></div></dl></section></div>
      ) : null}
      {detailView === 'history' ? (
        <div className={styles.detailBody}><section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Historical record</p><h3>Versions and submitted snapshots</h3></div><Button type='button' variant='outline'><Download aria-hidden='true' />Export</Button></div><ol className={styles.timeline}>{history.map((item) => <li key={item.date}><span aria-hidden='true' /><div><time>{item.date}</time><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ol></section></div>
      ) : null}
      <section className={styles.dangerZone}>
        <div><p className={styles.eyebrow}>Removal</p><h3>Archive before deleting</h3><p>Archiving keeps Tracker links and submitted snapshots intact.</p></div>
        <Button type='button' variant='outline'><Archive aria-hidden='true' />Archive Work</Button>
      </section>
    </aside>
  )
}

export function LibraryWorkSelected() {
  const [fixture, setFixture] = useState<Fixture>('normal')
  const [view, setView] = useState<LibraryView>('works')
  const [detailView, setDetailView] = useState<DetailView>('overview')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('updated')
  const [selectedWork, setSelectedWork] = useState<Work | null>(baseWorks[0]!)
  const [status, setStatus] = useState('')

  const allWorks = useMemo(() => {
    if (fixture === 'empty') return []
    if (fixture === 'large') return Array.from({ length: 24 }, (_, index) => ({ ...baseWorks[index % baseWorks.length]!, id: `large-${index}`, title: `${baseWorks[index % baseWorks.length]!.title} ${index + 1}` }))
    if (fixture === 'multi') return [{ ...baseWorks[1]!, files: 12, versions: 5, terms: ['Photography', 'Sound', 'Installation'] }, ...baseWorks.filter((work) => work.id !== 'harmattan')]
    return baseWorks
  }, [fixture])

  const filteredWorks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle ? allWorks.filter((work) => `${work.title} ${work.description} ${work.medium} ${work.terms.join(' ')}`.toLowerCase().includes(needle)) : allWorks
    return [...filtered].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : b.updated.localeCompare(a.updated))
  }, [allWorks, query, sort])

  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle ? files.filter((file) => `${file.name} ${file.linkedTo} ${file.kind}`.toLowerCase().includes(needle)) : files
    return [...filtered].sort((a, b) => sort === 'title' ? a.name.localeCompare(b.name) : b.updated.localeCompare(a.updated))
  }, [query, sort])

  const filteredAnswers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle ? answers.filter((answer) => `${answer.name} ${answer.excerpt}`.toLowerCase().includes(needle)) : answers
    return [...filtered].sort((a, b) => sort === 'title' ? a.name.localeCompare(b.name) : b.updated.localeCompare(a.updated))
  }, [query, sort])

  const visibleItems = view === 'works' ? filteredWorks : view === 'files' ? filteredFiles : filteredAnswers
  const totalItems = view === 'works' ? allWorks : view === 'files' ? files : answers
  const viewLabel = view === 'answers' ? 'Saved Answers' : view[0]!.toUpperCase() + view.slice(1)

  function chooseFixture(next: Fixture) {
    setFixture(next)
    setQuery('')
    setSelectedWork(next === 'empty' ? null : baseWorks[0]!)
    setDetailView('overview')
  }

  return (
    <div className={styles.pageShell}>
      <ReviewBar fixture={fixture} setFixture={chooseFixture} />
      <AppHeader />
      <main id='library-content' className={styles.main}>
        <div className={styles.pageHeading}>
          <div><p className={styles.eyebrow}>Private creative archive</p><h1>Library</h1><p>Find the Work, file, or reusable answer you need—without changing its submission history.</p></div>
          <Button type='button' onClick={() => setStatus(`Create ${view === 'works' ? 'Work' : view === 'files' ? 'file upload' : 'Saved Answer'} opened.`)}><Plus aria-hidden='true' />{view === 'works' ? 'New Work' : view === 'files' ? 'Upload file' : 'New Saved Answer'}</Button>
        </div>

        <div className={styles.libraryNav}>
          <nav aria-label='Library views'>
            {([{ id: 'works', label: 'Works' }, { id: 'files', label: 'Files' }, { id: 'answers', label: 'Saved Answers' }] as Array<{ id: LibraryView; label: string }>).map((item) => (
              <button key={item.id} type='button' aria-current={view === item.id ? 'page' : undefined} onClick={() => { setView(item.id); setSelectedWork(null); setQuery('') }}>{item.label}<span>{item.id === 'works' ? allWorks.length : item.id === 'files' ? files.length : answers.length}</span></button>
            ))}
          </nav>
          <p><ShieldCheck aria-hidden='true' />Private by default</p>
        </div>

        {fixture === 'deprecated' ? <StateNotice fixture={fixture} /> : null}

        {fixture === 'empty' && view === 'works' ? <EmptyLibrary onCreate={() => setStatus('Create Work opened.')} /> : (
          <div className={selectedWork ? styles.masterDetail : styles.libraryLayout}>
            <section className={styles.indexPanel} aria-label={`${view === 'answers' ? 'Saved Answers' : view[0]!.toUpperCase() + view.slice(1)} index`}>
              <div className={styles.toolbar}>
                <label className={styles.searchField}><Search aria-hidden='true' /><span className={styles.srOnly}>Search {view === 'answers' ? 'Saved Answers' : view}</span><input type='search' value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${view === 'answers' ? 'Saved Answers' : view}`} /></label>
                <Button type='button' variant='outline'><Filter aria-hidden='true' />Filter</Button>
                <label className={styles.sortField}><span className={styles.srOnly}>Sort results</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value='updated'>Recently updated</option><option value='title'>Title A–Z</option></select><ChevronDown aria-hidden='true' /></label>
              </div>
              <div className={styles.resultMeta}><p>{query ? `${visibleItems.length} matching` : visibleItems.length} {viewLabel}</p><span>{fixture === 'large' && view === 'works' ? 'Showing 24 of 128' : `${totalItems.length} total`}</span></div>
              <div className={styles.resultList}>
                {view === 'works' ? filteredWorks.map((work) => <WorkRow key={work.id} work={work} selected={selectedWork?.id === work.id} onOpen={(next) => { setSelectedWork(next); setDetailView('overview') }} />) : null}
                {view === 'files' ? filteredFiles.map((file) => <FileRow key={file.id} file={fixture === 'missing' && file.id === 'cover' ? { ...file, state: 'missing' } : file} onOpen={setStatus} />) : null}
                {view === 'answers' ? filteredAnswers.map((answer) => <AnswerRow key={answer.id} answer={answer} onCopy={(item) => setStatus(`${item.name} copied.`)} />) : null}
                {!visibleItems.length && query ? <div className={styles.noResults}><Search aria-hidden='true' /><h2>No {viewLabel} match “{query}”</h2><p>Clear search or try a title, file name, medium, or field term.</p><Button type='button' variant='outline' onClick={() => setQuery('')}>Clear search</Button></div> : null}
              </div>
              {fixture === 'large' ? <div className={styles.pagination}><Button type='button' variant='outline' disabled>Previous</Button><span>Page 1 of 6</span><Button type='button' variant='outline'>Next</Button></div> : null}
            </section>
            {selectedWork ? <WorkDetail work={selectedWork} fixture={fixture} detailView={detailView} setDetailView={setDetailView} onClose={() => setSelectedWork(null)} onStatus={setStatus} /> : null}
          </div>
        )}
        <p className={styles.liveStatus} role='status' aria-live='polite'>{status}{status ? <Check aria-hidden='true' /> : null}</p>
      </main>
    </div>
  )
}
