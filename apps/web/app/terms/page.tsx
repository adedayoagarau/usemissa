import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  LEGAL_GOVERNING_LAW,
  LEGAL_POSTAL_ADDRESS,
  hasPostalAddress,
} from "@/lib/legalContact";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms for using Missa, including accounts, your content, Plus subscriptions, and our responsibilities.",
  alternates: { canonical: "https://www.usemissa.com/terms" },
};

const operator = LEGAL_ENTITY_NAME || "Missa";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-2xl font-medium text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

const linkClass = "text-foreground underline underline-offset-4";

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
        Use Missa with the source in view.
      </h1>
      <div className="mt-10 space-y-8 text-base leading-7 text-muted-foreground">
        <Section title="Who these terms are with">
          <p>
            These terms are an agreement between you and {operator}, which
            operates Missa. By creating an account or using Missa, you accept
            them. If you use Missa for an Organization, you confirm you may
            accept these terms on its behalf.
          </p>
          <p>
            Our <Link className={linkClass} href="/privacy">Privacy notice</Link>{" "}
            explains how we handle personal data and forms part of these terms.
          </p>
        </Section>

        <Section title="Who can use Missa">
          <p>
            You must be at least 16 years old, or the age of digital consent
            where you live if that is higher, to create an account. You may not
            use Missa if the law where you live does not allow it.
          </p>
        </Section>

        <Section title="Check the official source">
          <p>
            Missa summarizes Opportunities from public sources and from
            Organizations. The Organization&apos;s official page controls its
            deadline, eligibility, fee, rights, and application instructions.
            Confirm consequential details there before you act. Missa does not
            decide who is selected, and we are not responsible for an
            Organization&apos;s decisions, fees, or conduct.
          </p>
          <p>
            Rankings, response times, and other figures on Missa are estimates
            built from the data we hold. Each one explains its basis; none is a
            promise about an outcome.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            Give accurate information, keep your sign-in details secure, and
            tell us promptly if you think someone else has used your account.
            You are responsible for activity on your account.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>Do not use Missa to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>break the law or infringe someone else&apos;s rights;</li>
            <li>post reviews, claims, or content that is false, misleading, or written as someone else;</li>
            <li>upload malware or try to get around security, rate limits, or access controls;</li>
            <li>scrape, resell, or bulk-copy the catalog without our written permission;</li>
            <li>harass Organizations, reviewers, or other creators.</li>
          </ul>
          <p>
            We may remove content or limit an account that breaks these rules.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            You keep the rights you hold in any Work, text, or media you add.
            You give Missa a limited permission to store, process, and display
            it only as needed to run the features you use: keeping it private
            on your account, sending it to an Organization when you submit, and
            publishing the parts you choose to publish in a portfolio. That
            permission ends when you delete the content or close your account,
            except for copies an Organization already received from a
            submission you made.
          </p>
          <p>
            Only add content you have the right to share. If you believe
            something on Missa infringes your rights, email{" "}
            <a className={linkClass} href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
              {LEGAL_CONTACT_EMAIL}
            </a>{" "}
            with the page address, the work concerned, and your contact
            details, and we will review it promptly.
          </p>
        </Section>

        <Section title="Plus subscriptions">
          <p>
            Missa Plus is a paid plan. The price, currency, and billing period
            are shown before you pay and may differ by region. Payments are
            processed by Stripe; Missa does not store your card details.
          </p>
          <p>
            Plus renews automatically at the end of each billing period until
            you cancel. You can cancel at any time from Plan, and Plus stays
            active until the end of the period you have paid for. We do not
            refund partial periods, except where the law requires it. If you
            close your account, we cancel the subscription.
          </p>
          <p>
            If we change the price of Plus, we will email you before the change
            applies to your next renewal, and you can cancel before then.
          </p>
        </Section>

        <Section title="Connected services">
          <p>
            Some features connect to other services, such as a calendar
            provider. Those services have their own terms, and you can
            disconnect them at any time. We are not responsible for services we
            do not operate.
          </p>
        </Section>

        <Section title="Changes and availability">
          <p>
            We keep improving Missa, so features may change, and some may be
            labeled as early or limited. We aim to keep Missa available but
            cannot promise it will always be uninterrupted or error-free. If we
            make a material change to these terms, we will tell you by email or
            in Missa before it takes effect.
          </p>
        </Section>

        <Section title="Ending your use">
          <p>
            You can close your account at any time from your Profile. We may
            suspend or close an account that seriously or repeatedly breaks
            these terms, and we will tell you why unless the law prevents it.
            Sections that by their nature should continue, such as those on
            liability, continue after your account closes.
          </p>
        </Section>

        <Section title="Our responsibility to you">
          <p>
            Missa is provided as it is and as available. To the extent the law
            allows, we exclude implied warranties, and we are not liable for
            indirect or consequential losses, including a missed deadline,
            opportunity, or selection, or lost profits or data.
          </p>
          <p>
            To the extent the law allows, our total liability to you for any
            claim relating to Missa is limited to the greater of the amount you
            paid us in the 12 months before the claim and 100 US dollars.
          </p>
          <p>
            Nothing in these terms limits liability that cannot be limited by
            law, or removes rights you have as a consumer where you live.
          </p>
        </Section>

        <Section title="Disputes">
          <p>
            {LEGAL_GOVERNING_LAW
              ? `These terms are governed by ${LEGAL_GOVERNING_LAW}. `
              : null}
            If something goes wrong, please email us first so we can try to
            resolve it. If you are a consumer, you keep any right to bring a
            claim in the courts where you live.
          </p>
        </Section>

        <Section title="Questions">
          {LEGAL_ENTITY_NAME ? <p>{LEGAL_ENTITY_NAME} operates Missa.</p> : null}
          {hasPostalAddress() && (
            <address className="not-italic whitespace-pre-line">
              {LEGAL_POSTAL_ADDRESS}
            </address>
          )}
          <p>
            For a question about these terms, email{" "}
            <a className={linkClass} href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
              {LEGAL_CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>
      <p className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">
        Last updated October 3, 2026.
      </p>
    </main>
  );
}
