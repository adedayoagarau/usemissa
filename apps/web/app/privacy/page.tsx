import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Missa stores when you browse, create an account, save an Opportunity, or publish a portfolio.',
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
          <p className="mt-3">You can browse the catalogue, directory and rankings without signing in. Missa records a first-party session identifier and basic product analytics for this site, such as which pages and filters are used, so we can tell what is working. We do not use it to build a public profile of you.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Your account</h2>
          <p className="mt-3">When you create an account we store your name, email address and a hashed password. Your email is used to sign you in, to keep your account secure, and to send product messages you have asked for. We never publish your email address.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Saves, applications and preparation</h2>
          <p className="mt-3">When you save an Opportunity, follow a deadline, or prepare application material, that content is stored on your account so it is there when you return. This work is private by default. Missa does not send an application, and does not contact an Organization on your behalf, unless you take that step with the official source yourself.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Portfolio</h2>
          <p className="mt-3">If you publish a portfolio, the details you add there are visible to anyone with the link. You choose what to include, and you can change or remove it. Anything you leave unpublished stays out of your public portfolio.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Connected services</h2>
          <p className="mt-3">If you connect a calendar, Missa stores the access you grant so it can add deadlines you ask for. You can disconnect at any time in your account settings, which stops further access. Email delivery and hosting are handled by third-party providers that process data on Missa&apos;s behalf.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Retention and your choices</h2>
          <p className="mt-3">We keep account records while your account is open and for as long as needed to run Missa and meet our obligations. You can ask us to correct or delete your data, or to explain what we hold, at any time.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Contact</h2>
          <p className="mt-3">To ask a privacy question or request removal, email <a className="text-foreground underline underline-offset-4" href="mailto:hello@usemissa.com">hello@usemissa.com</a>. See the <Link className="text-foreground underline underline-offset-4" href="/terms">Terms</Link> for how the beta works.</p>
        </section>
      </div>
      <p className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">Last updated September 12, 2026. Missa is in beta, and this notice will be expanded as the product changes.</p>
    </main>
  );
}
