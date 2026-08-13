import { LockKeyhole } from 'lucide-react';
import { redirect } from 'next/navigation';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';
import { MissaWordmark } from '@/components/missa-wordmark';
import { WaitlistForm } from './waitlist-form';
import { WaitlistArtwork } from './waitlist-artwork';
import { WaitlistFaq } from './waitlist-faq';
import { waitlistFaqs } from './waitlist-faq-content';
import styles from './waitlist.module.css';

const waitlistDescription = 'Missa brings clarity to creative opportunities around the world, so you can spend less time searching, and more time making.';

export const metadata = pageMetadata({
  title: 'Join the Missa waitlist | Creative opportunities',
  description: waitlistDescription,
  path: '/waitlist',
});

export default async function WaitlistPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = searchParams ? await searchParams : {};
  const campaign = new URLSearchParams();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = Array.isArray(raw[key]) ? raw[key][0] : raw[key];
    if (value) campaign.set(key, value.slice(0, 120));
  }
  const current = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) current.set(key, first);
  }
  if (current.toString() !== campaign.toString()) redirect(campaign.size ? `/waitlist?${campaign.toString()}` : '/waitlist');

  return (
    <div className={styles.page}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Join the Missa waitlist', description: waitlistDescription, url: absoluteUrl('/waitlist') }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'Missa', url: absoluteUrl('/waitlist'), logo: absoluteUrl('/brand/missa-wordmark-240.svg'), image: absoluteUrl('/brand/missa-social-share.png') }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: waitlistFaqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }} />
      <header className={styles.header}>
        <MissaWordmark size="compact" />
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.hero}>
          <section className={styles.copy} aria-labelledby="waitlist-heading">
            <h1 id="waitlist-heading"><span>There is a god in every door.</span><span>And a door, and a door, and a door.</span></h1>
            <div className={styles.conversionBlock}>
              <p className={styles.description}>{waitlistDescription}</p>
              <div className={styles.joinBlock}>
                <WaitlistForm />
                <p className={styles.finePrint}><LockKeyhole aria-hidden="true" /> For creators and organizations.</p>
              </div>
            </div>
          </section>
          <WaitlistArtwork />
        </section>
        <WaitlistFaq />
      </main>

      <footer className={styles.footer}>
        <span>© Missa</span>
        <span>Opportunities for creative work, with the source and limits kept visible.</span>
        <a href="/privacy">Privacy</a>
      </footer>
    </div>
  );
}
