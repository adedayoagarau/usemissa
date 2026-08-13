import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { MissaWordmark } from '@/components/missa-wordmark';
import styles from './reviews.module.css';

export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent('/reviews')}`);

  return <div className={styles.shell}>
    <a className={styles.skipLink} href="#reviews-main">Skip to review content</a>
    <header className={styles.topbar}>
      <MissaWordmark size="app" className={styles.wordmark} />
      <nav aria-label="Reviewer navigation"><Link href="/reviews" aria-current="page">Reviews</Link><Link href="/profile">Profile</Link></nav>
      <Link className={styles.account} href="/profile" aria-label="Open Profile"><span>{session.account.email.slice(0, 1).toUpperCase()}</span><small>{session.account.email.split('@')[0]}</small></Link>
    </header>
    {children}
  </div>;
}
