import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
} from "lucide-react";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Missa verifies opportunities",
  description:
    "Learn how Missa collects, checks, labels, and refreshes public opportunity records before creators rely on them.",
  path: "/methodology",
});

const checks = [
  [
    "Source identity",
    "We keep the official source URL visible and check that the organization and destination are identifiable.",
  ],
  [
    "Deadline and window",
    "We distinguish exact dates, rolling windows, until-filled calls, and details that still need confirmation.",
  ],
  [
    "Fees and requirements",
    "We show what the current record says about fees, materials, eligibility, and formats without treating missing facts as zero.",
  ],
  [
    "Freshness",
    "Public records carry a source-check signal. A stale record is a prompt to verify, not a promise that the call is still open.",
  ],
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "How Missa verifies opportunities",
          description: "Missa source and verification methodology.",
          url: absoluteUrl("/methodology"),
          isPartOf: {
            "@type": "WebSite",
            name: "Missa",
            url: absoluteUrl("/"),
          },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Missa", path: "/" },
          { name: "How Missa verifies opportunities" },
        ])}
      />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-heading text-2xl font-semibold">
            Missa
          </Link>
          <nav
            className="flex items-center gap-4 text-sm text-muted-foreground"
            aria-label="Methodology navigation"
          >
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link
              href="/opportunities-preview"
              className="hover:text-foreground"
            >
              Browse opportunities
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Missa methodology
          </p>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.04em] sm:text-6xl">
            A listing is useful when its evidence is visible.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Missa helps creators find opportunities, but the official
            organization page remains the authority. Our job is to make the
            important checks easier to see before you spend time preparing an
            application.
          </p>
        </header>

        <section className="mt-16" aria-labelledby="checks-heading">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            What we check
          </p>
          <h2
            id="checks-heading"
            className="mt-2 font-heading text-3xl font-medium"
          >
            Four signals shape a public record.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {checks.map(([title, copy]) => (
              <article
                key={title}
                className="rounded-xl border border-border bg-card p-6"
              >
                <CheckCircle2
                  className="size-5 text-green-700"
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-heading text-2xl font-medium">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="mt-16 grid gap-10 lg:grid-cols-2"
          aria-labelledby="labels-heading"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              How to read a page
            </p>
            <h2
              id="labels-heading"
              className="mt-2 font-heading text-3xl font-medium"
            >
              Confidence is not decoration.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                <strong className="text-foreground">Source-linked</strong> means
                the page keeps the official destination visible so you can
                inspect the underlying call.
              </p>
              <p>
                <strong className="text-foreground">Confirmed</strong> means the
                current source record supports the fact shown.
              </p>
              <p>
                <strong className="text-foreground">Needs confirmation</strong>{" "}
                means Missa has not established the fact strongly enough to
                present it as settled.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-6">
            <div className="flex items-start gap-3">
              <CircleAlert
                className="mt-1 size-5 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-heading text-2xl font-medium">
                  Before you apply
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Read the official source, confirm the deadline and
                  requirements, and make sure the submission path is the one you
                  intend to use. Missa does not guarantee acceptance,
                  eligibility, or that a third-party page will remain unchanged.
                </p>
              </div>
            </div>
            <a
              href="mailto:hello@usemissa.com"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium"
            >
              Report a record issue <ExternalLink className="size-3.5" />
            </a>
          </div>
        </section>

        <section
          className="mt-16 rounded-xl border border-border bg-card p-6 sm:p-8"
          aria-labelledby="refresh-heading"
        >
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            A living library
          </p>
          <h2
            id="refresh-heading"
            className="mt-2 font-heading text-3xl font-medium"
          >
            Freshness is a continuing responsibility.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Missa refreshes public source records through its Radar pipeline and
            keeps publication fail-closed when required evidence is missing.
            That means a record can be useful without pretending that the web is
            static. The page tells you what was checked and what still needs
            your attention.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/discover/contests"
              className="inline-flex items-center gap-2 text-sm font-medium"
            >
              See source-linked records <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/guides/verify-an-opportunity-before-applying"
              className="inline-flex items-center gap-2 text-sm font-medium"
            >
              Read the verification guide <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
