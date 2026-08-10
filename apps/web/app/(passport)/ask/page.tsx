import { redirect } from 'next/navigation';

import { AskMissa } from '@/components/chat/ask-missa';

import styles from './ask.module.css';

export default function AskPage() {
  if (process.env.MISSA_CHAT_ENABLED?.trim() !== '1') redirect('/opportunities');
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p>Bounded, source-linked search</p>
        <h1>Ask Missa</h1>
        <span>Search Missa’s published Opportunities in plain language. Practice filters stay separate across all 12 facets, and every result keeps its official-source link.</span>
      </header>
      <AskMissa />
    </main>
  );
}
