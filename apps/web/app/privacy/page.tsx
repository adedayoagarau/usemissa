import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy | Missa',
  description: 'How Missa handles information shared through the public waitlist.',
  alternates: { canonical: 'https://www.usemissa.com/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-[min(100%-40px,720px)] py-16 text-foreground sm:py-24">
      <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/waitlist">Back to the waitlist</Link>
      <p className="mt-16 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Missa privacy</p>
      <h1 className="mt-3 font-heading text-5xl font-medium tracking-tight sm:text-7xl">A clear note about your email.</h1>
      <div className="mt-10 space-y-6 text-base leading-7 text-muted-foreground">
        <p>If you join the Missa waitlist, we use your email address to contact you about Missa access and related product updates. We do not publish it on the site.</p>
        <p>We keep the signup record in Missa&apos;s application database and retain campaign details only to understand which public invitations are useful. You can ask us to remove your signup at any time.</p>
        <p>To request removal or ask a privacy question, email <a className="text-foreground underline underline-offset-4" href="mailto:hello@usemissa.com">hello@usemissa.com</a>.</p>
      </div>
      <p className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">This page describes the current waitlist flow. Missa will publish a fuller privacy notice as the product opens.</p>
    </main>
  );
}
