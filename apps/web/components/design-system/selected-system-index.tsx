import Link from 'next/link'
import { ArrowRight, Check, GitCompareArrows, LockKeyhole, MonitorSmartphone } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { MissaWordmark } from '@/components/missa-wordmark'

import { selectedSystemGroups, selectedSystemItems } from './selected-system-manifest'
import styles from './selected-system-index.module.css'

export function SelectedSystemIndex() {
  const comparisonCount = selectedSystemItems.filter((item) => item.comparisonPath).length

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href='#selected-system'>Skip to selected system</a>

      <header className={styles.header}>
        <MissaWordmark href='/design-system' size='app' className={styles.wordmark} />
        <Badge variant='outline'>Local review only</Badge>
      </header>

      <section className={styles.hero} aria-labelledby='selected-system-title'>
        <div>
          <p className={styles.eyebrow}>Missa 2.0 · selected system</p>
          <h1 id='selected-system-title'>The whole overhaul, in one place</h1>
          <p className={styles.lede}>
            These are the selected local compositions for every page family. Each choice is grounded in the page job,
            user context, taxonomy boundaries, narrow-screen behavior, and failure states—not the premium demo category.
          </p>
        </div>
        <aside className={styles.boundary} aria-label='Promotion boundary'>
          <LockKeyhole aria-hidden='true' />
          <div>
            <strong>Product routes are unchanged</strong>
            <p>Selection and comparison stay inside the local component library until a page is explicitly promoted.</p>
            <Link className={styles.secondaryLink} href='/design-system/component-policy'>Open component policy</Link>
          </div>
        </aside>
      </section>

      <dl className={styles.summary} aria-label='Selected system summary'>
        <div><dt>Selected compositions</dt><dd>{selectedSystemItems.length}</dd></div>
        <div><dt>Retained comparisons</dt><dd>{comparisonCount}</dd></div>
        <div><dt>Review widths</dt><dd>Phone + desktop</dd></div>
      </dl>

      <nav className={styles.groupNav} aria-label='Selected system sections'>
        {selectedSystemGroups.map((group) => <a key={group.id} href={`#${group.id}`}>{group.label}</a>)}
      </nav>

      <div id='selected-system' className={styles.groups}>
        {selectedSystemGroups.map((group) => (
          <section className={styles.group} id={group.id} key={group.id} aria-labelledby={`${group.id}-title`}>
            <header className={styles.groupHeader}>
              <div>
                <p className={styles.eyebrow}>Page family</p>
                <h2 id={`${group.id}-title`}>{group.label}</h2>
              </div>
              <p>{group.description}</p>
            </header>

            <div className={styles.list}>
              {group.items.map((item) => (
                <article className={styles.item} key={item.selectedPath}>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTitleRow}>
                      <span className={styles.check}><Check aria-hidden='true' /></span>
                      <div>
                        <h3>{item.title}</h3>
                        <p className={styles.selection}>{item.selection}</p>
                      </div>
                    </div>
                    <p className={styles.objective}>{item.objective}</p>
                  </div>
                  <div className={styles.actions}>
                    <Link className={styles.primaryLink} href={item.selectedPath}>
                      <MonitorSmartphone aria-hidden='true' /> Open selected <ArrowRight aria-hidden='true' />
                    </Link>
                    {item.comparisonPath ? (
                      <Link className={styles.secondaryLink} href={item.comparisonPath}>
                        <GitCompareArrows aria-hidden='true' /> Compare options
                      </Link>
                    ) : <span className={styles.noComparison}>Responsive synthesis</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
