import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { discoveryContentLastModified, discoveryContentLastModifiedLabel } from "@/lib/discoveryGuides";

export const metadata = pageMetadata({
  title: "About Missa",
  description:
    "Missa helps creators find submission opportunities, understand the source details, and decide what deserves their time.",
  path: "/about",
});

const principles = [
  [
    "Source first",
    "The organization’s official page remains the authority. Missa gives you a clearer starting point, not a substitute for reading the call.",
  ],
  [
    "Useful uncertainty",
    "When a deadline, fee, or eligibility rule is not confirmed, we say so instead of filling the gap with a guess.",
  ],
  [
    "Creator context",
    "A good opportunity is not just open. It needs to make sense for the work, practice, materials, and time you bring to it.",
  ],
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Missa",
          description:
            "Missa helps creators find and understand submission opportunities.",
          url: absoluteUrl("/about"),
          dateModified: discoveryContentLastModified.toISOString(),
          about: {
            "@type": "Organization",
            name: "Missa",
            url: absoluteUrl("/"),
            email: "hello@usemissa.com",
          },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Missa", path: "/" },
          { name: "About Missa" },
        ])}
      />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-heading text-2xl font-semibold">
            Missa
          </Link>
          <nav
            className="flex items-center gap-4 text-sm text-muted-foreground"
            aria-label="About navigation"
          >
            <Link href="/methodology" className="hover:text-foreground">
              How we verify
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
            About Missa
          </p>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.04em] sm:text-6xl">
            Find the calls that fit. Understand what you are seeing.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Missa is a source-first opportunity library for creators. We bring
            open calls, grants, magazines, residencies, fellowships, and
            contests into one place, with the details that help you decide
            whether an opportunity is worth your time.
          </p>
          <p className="mt-3 text-xs text-muted-foreground"><time dateTime={discoveryContentLastModified.toISOString()}>Reviewed {discoveryContentLastModifiedLabel}</time></p>
        </header>

        <section
          className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]"
          aria-labelledby="why-heading"
        >
          <div>
            <h2 id="why-heading" className="font-heading text-3xl font-medium">
              The work behind a useful listing
            </h2>
            <div className="mt-6 space-y-5 text-base leading-7 text-muted-foreground">
              <p>
                Finding an opportunity is only the beginning. A creator also
                needs to know whether the deadline is current, what the source
                actually asks for, whether there is a fee, and which
                requirements could make the call a poor fit.
              </p>
              <p>
                Missa makes those checks visible. We separate facts from
                interpretation, show where a record came from, and keep the
                official source one click away. When the evidence is incomplete,
                the page should make that uncertainty easier to act on.
              </p>
            </div>
          </div>
          <aside className="h-fit rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              For organizations
            </p>
            <h2 className="mt-3 font-heading text-2xl font-medium">
              Make your call easier to understand.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Organizations can publish clear open calls and manage submissions
              in the Missa workspace.
            </p>
            <Link
              href="/for-organizations"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium"
            >
              See the organization platform <ArrowRight className="size-4" />
            </Link>
          </aside>
        </section>

        <section className="mt-16" aria-labelledby="principles-heading">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Our principles
          </p>
          <h2
            id="principles-heading"
            className="mt-2 font-heading text-3xl font-medium"
          >
            Clarity is part of the product.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {principles.map(([title, copy]) => (
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
          className="mt-16 rounded-xl border border-border bg-muted/20 p-6 sm:p-8"
          aria-labelledby="next-heading"
        >
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Keep going
          </p>
          <h2
            id="next-heading"
            className="mt-2 font-heading text-3xl font-medium"
          >
            See how the evidence is handled.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Read the verification methodology, or browse current opportunities
            with the source and deadline in view.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/methodology"
              className="inline-flex items-center gap-2 text-sm font-medium"
            >
              How Missa verifies records <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/opportunities-preview"
              className="inline-flex items-center gap-2 text-sm font-medium"
            >
              Browse the library <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
