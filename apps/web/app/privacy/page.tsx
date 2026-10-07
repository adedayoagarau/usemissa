import type { Metadata } from 'next';
import Link from 'next/link';
import { AnalyticsChoiceControl } from '@/components/missa/analytics-choice-control';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  LEGAL_POSTAL_ADDRESS,
  hasPostalAddress,
} from '@/lib/legalContact';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Missa stores when you browse, create an account, save an opportunity, or publish a portfolio.',
  alternates: { canonical: 'https://www.usemissa.com/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-[min(100%-40px,720px)] py-16 text-foreground sm:py-24">
      <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/">Back to Missa</Link>
      <p className="mt-16 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Missa privacy</p>
      <h1 className="mt-3 font-heading text-5xl font-medium tracking-tight sm:text-7xl">What Missa keeps, and why.</h1>
      <div className="mt-10 space-y-8 text-base leading-7 text-muted-foreground">
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Browsing without an account</h2>
          <p className="mt-3">You can browse the catalog, directory and rankings without signing in. Detailed product analytics only start if you accept them, and declining changes nothing about what you can use. If you accept, Missa records a first-party session identifier and basic product analytics, such as which pages and filters are used, so we can tell what is working. We do not use it to build a public profile of you, and we do not sell personal data or run advertising.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Cookies and analytics</h2>
          <p className="mt-3">A banner asks for your analytics decision on your first visit. Turning analytics off stops both the third-party analytics client and Missa&apos;s own event records; turning it on starts them. The cookieless visit counts described below are not affected by this choice. Accepting is never required to use Missa. The only thing stored on your device before you choose is a record of the choice itself, so the banner does not reappear.</p>
          <p className="mt-3">Separately, Missa counts visits without cookies so we know how many people use the site. For each page you open we record the page address, the site that linked you here, the country from your connection, your device type and browser, and page-speed and error measurements. To tell one visit from another we use a code made by scrambling your IP address and browser details with a random key that changes every day and is then deleted. That code cannot be turned back into your IP address, cannot follow you from one day to the next, and nothing is stored on your device. We never store your IP address or browser details themselves. If your browser sends a Global Privacy Control signal, these visits are not counted.</p>
          <p className="mt-3">Signing in, saving an opportunity, or submitting an application still produces account and operational records. Those are part of the service you asked for, not optional analytics.</p>
          <AnalyticsChoiceControl />
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Your account</h2>
          <p className="mt-3">When you create an account we store your name, email address and a hashed password. Your email is used to sign you in, to keep your account secure, and to send product messages you have asked for. We never publish your email address.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Saves, applications and preparation</h2>
          <p className="mt-3">When you save an opportunity, follow a deadline, or prepare application material, that content is stored on your account so it is there when you return. This work is private by default. Missa does not send an application, and does not contact an organization on your behalf, unless you take that step with the official source yourself.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Portfolio</h2>
          <p className="mt-3">If you publish a portfolio, the details you add there are visible to anyone with the link. You choose what to include, and you can change or remove it. Anything you leave unpublished stays out of your public portfolio.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Submissions to Organizations</h2>
          <p className="mt-3">When you submit to an organization through Missa, the material and details you choose to include are shared with that organization and the reviewers it assigns. The organization then handles them under its own privacy policy. Missa keeps a receipt of the submission on your account.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Connected services</h2>
          <p className="mt-3">If you connect a Google or Microsoft calendar, Missa stores the access you grant, encrypted, so it can add and update the deadlines you ask for. It does not read your other calendar events. You can disconnect at any time in your account settings, which stops further access, and you can also revoke access from your Google or Microsoft account.</p>
          <p className="mt-3">If you connect Gmail, Missa reads recent messages to find submission confirmations and responses, so it can suggest a status for you to confirm. It uses message content only for that purpose. Missa&apos;s use and transfer of information received from Google APIs adheres to the <a className="text-foreground underline underline-offset-4" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements. We do not use that information for advertising, do not sell it, and do not let people read it except with your permission, for security, or where the law requires.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Service providers</h2>
          <p className="mt-3">These providers process data on Missa&apos;s behalf, under contract, only to run the service:</p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Vercel and Railway, for hosting and background jobs;</li>
            <li>Neon, for the database and sign-in;</li>
            <li>Resend, for email delivery;</li>
            <li>Telnyx, for text reminders: if you are a Plus member and turn on text reminders, Telnyx processes your phone number to deliver them;</li>
            <li>Stripe, for Plus payments (Stripe handles card details; Missa never sees them);</li>
            <li>Upstash, for rate limiting that protects sign-in;</li>
            <li>Cloudmersive, for scanning uploaded files for malware;</li>
            <li>PostHog, for analytics, only if you accept it;</li>
            <li>Sentry, for error reports that help us fix problems, with personal details removed where possible.</li>
          </ul>
          <p className="mt-3">Some of these providers process data outside the country where you live, including in the United States. Where data protection law requires it, those transfers rely on safeguards such as the European Commission&apos;s standard contractual clauses.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Why we use your data</h2>
          <p className="mt-3">We use account, saved, and submission data to provide the service you asked for. We use security records and rate limits because we have a legitimate interest in keeping Missa safe. We use optional analytics only with your consent, which you can withdraw at any time above. We keep billing records because the law requires it.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Retention and your choices</h2>
          <p className="mt-3">We keep account records while your account is open. Closing your account from Profile deactivates it and signs you out. To have your personal data deleted, email us and we will delete or anonymize it within 30 days, except billing records we must keep by law and backups that expire on their normal cycle. Submissions already sent to an organization stay with that organization.</p>
          <p className="mt-3">You can ask us to access, correct, export, or delete your data, to restrict or object to how we use it, or to explain what we hold. Email us using the address below and we will reply within 30 days. You can also complain to your local data protection authority, such as the Nigeria Data Protection Commission, the UK Information Commissioner&apos;s Office, or a supervisory authority in the European Union.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Security</h2>
          <p className="mt-3">We encrypt data in transit, store passwords only as hashes, encrypt connected-service credentials, keep uploaded files private, and scan submission files for malware. No system is perfectly secure; if a breach affects you, we will tell you as the law requires.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Children</h2>
          <p className="mt-3">Missa is not for children under 16, and we do not knowingly collect their data. If you think a child has created an account, email us and we will remove it.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Changes to this notice</h2>
          <p className="mt-3">If we make a material change, we will tell you by email or in Missa before it takes effect.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Who is responsible, and how to reach us</h2>
          <p className="mt-3">
            {LEGAL_ENTITY_NAME ? `${LEGAL_ENTITY_NAME} is ` : 'Missa is '}
            responsible for the personal data described here.
          </p>
          {hasPostalAddress() && (
            <address className="mt-3 not-italic whitespace-pre-line">
              {LEGAL_POSTAL_ADDRESS}
            </address>
          )}
          <p className="mt-3">To ask a privacy question or request removal, email <a className="text-foreground underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. See the <Link className="text-foreground underline underline-offset-4" href="/terms">Terms</Link> for the rules of using Missa.</p>
        </section>
      </div>
      <p className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">Last updated October 3, 2026.</p>
    </main>
  );
}
