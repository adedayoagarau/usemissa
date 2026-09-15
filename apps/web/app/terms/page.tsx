import type { Metadata } from "next";
import Link from "next/link";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  LEGAL_POSTAL_ADDRESS,
  hasPostalAddress,
} from "@/lib/legalContact";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using the Missa public beta.",
  alternates: { canonical: "https://www.usemissa.com/terms" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-[min(100%-40px,720px)] py-16 text-foreground sm:py-24">
      <Link
        className="text-sm text-muted-foreground underline underline-offset-4"
        href="/"
      >
        Back to Missa
      </Link>
      <p className="mt-16 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Missa terms
      </p>
      <h1 className="mt-3 font-heading text-5xl font-medium tracking-tight sm:text-7xl">
        Use the beta with the source in view.
      </h1>
      <div className="mt-10 space-y-8 text-base leading-7 text-muted-foreground">
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">The public beta</h2>
          <p className="mt-3">Missa helps people discover and organize creative Opportunities. Beta features and records may change as the product develops.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Check the official source</h2>
          <p className="mt-3">Missa summarizes information from public sources, but the Organization&apos;s official page controls its deadline, eligibility, fee, rights, and application instructions. Confirm consequential details there before acting.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Your account</h2>
          <p className="mt-3">Keep your account access secure and provide accurate information. Do not misuse Missa, interfere with the service, or use it to violate another person&apos;s rights.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Cookies and analytics</h2>
          <p className="mt-3">Optional analytics is off until you accept it, and you can change that choice at any time in the <Link className="text-foreground underline underline-offset-4" href="/privacy">Privacy notice</Link>. Declining does not restrict any part of Missa.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Your content</h2>
          <p className="mt-3">You keep the rights you hold in any Work, text, or media you add. You give Missa only the permission needed to store it privately and to publish the parts you explicitly choose to publish in a portfolio. Unpublished material stays private.</p>
        </section>
        <section>
          <h2 className="font-heading text-2xl font-medium text-foreground">Questions</h2>
          {LEGAL_ENTITY_NAME ? (
            <p className="mt-3">{LEGAL_ENTITY_NAME} operates Missa.</p>
          ) : null}
          {hasPostalAddress() && (
            <address className="mt-3 not-italic whitespace-pre-line">
              {LEGAL_POSTAL_ADDRESS}
            </address>
          )}
          <p className="mt-3">For a terms question, email <a className="text-foreground underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. See the <Link className="text-foreground underline underline-offset-4" href="/privacy">Privacy notice</Link> for the current public flow.</p>
        </section>
      </div>
      <p className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">Last updated September 13, 2026.</p>
    </main>
  );
}
