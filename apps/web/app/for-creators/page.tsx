import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { JsonLd, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import {
  discoveryContentLastModified,
  discoveryContentLastModifiedLabel,
} from "@/lib/discoveryGuides";

const creatorFaqs = [
  {
    question: "What can creators find on Missa?",
    answer:
      "Missa surfaces public contests, magazine submissions, poetry calls, grants, residencies, and fellowships when the source record is ready for discovery.",
  },
  {
    question: "How should I use a Missa opportunity listing?",
    answer:
      "Use it to compare the deadline, fee, eligibility, materials, and source context, then open the official organization or publication page and confirm the current instructions before applying.",
  },
  {
    question: "Does Missa guarantee that an opportunity is still open?",
    answer:
      "No. Missa shows a public source snapshot and freshness or confirmation context. Deadlines and requirements can change, so the official source remains the authority.",
  },
];

const creatorCategories = [
  {
    label: "Contests",
    href: "/discover/contests",
    description: "Prizes, calls for entries, and closing dates.",
  },
  {
    label: "Magazines",
    href: "/discover/magazines",
    description: "Publications, reading periods, and formats.",
  },
  {
    label: "Poetry",
    href: "/discover/poetry",
    description: "Poetry-related calls and submission paths.",
  },
  {
    label: "Grants",
    href: "/discover/grants",
    description: "Funding opportunities for creative work.",
  },
  {
    label: "Residencies",
    href: "/discover/residencies",
    description: "Places and time to develop new work.",
  },
  {
    label: "Fellowships",
    href: "/discover/fellowships",
    description: "Support for practice and research.",
  },
];

export const metadata = pageMetadata({
  title: "Opportunities for creators | Missa",
  description:
    "Find source-linked grants, magazines, residencies, fellowships, contests, and poetry opportunities, then compare the details before applying.",
  path: "/for-creators",
});

export default function ForCreatorsPage() {
  return (
    <main className="min-h-screen bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Opportunities for creators",
          description:
            "Source-linked creative opportunities and guidance for creators.",
          url: absoluteUrl("/for-creators"),
          dateModified: discoveryContentLastModified.toISOString(),
          isPartOf: {
            "@type": "WebSite",
            name: "Missa",
            url: absoluteUrl("/"),
          },
          publisher: {
            "@type": "Organization",
            name: "Missa",
            url: absoluteUrl("/"),
          },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: creatorCategories.map((category, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: category.label,
              url: absoluteUrl(category.href),
            })),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: creatorFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Missa", path: "/" },
          { name: "For creators", path: "/for-creators" },
        ])}
      />

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-heading text-2xl font-semibold">
            Missa
          </Link>
          <nav
            className="flex items-center gap-4 text-sm text-muted-foreground"
            aria-label="Creator navigation"
          >
            <Link href="/guides" className="hover:text-foreground">
              Guides
            </Link>
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

      <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          For creators
        </p>
        <h1 className="mt-3 max-w-3xl font-heading text-4xl font-medium tracking-[-0.04em] sm:text-6xl">
          Find opportunities that fit your work.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          Missa is a source-first opportunity library and submission workspace
          for creators. Find the call, compare the details, and keep the
          official source in view before you prepare your submission.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/opportunities-preview"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
          >
            Browse open opportunities <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium"
          >
            Read the guides <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          <time dateTime={discoveryContentLastModified.toISOString()}>
            Reviewed {discoveryContentLastModifiedLabel}
          </time>
        </p>

        <section className="mt-16" aria-labelledby="categories-heading">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Start with what you make
          </p>
          <h2
            id="categories-heading"
            className="mt-2 font-heading text-3xl font-medium"
          >
            Browse by opportunity type.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creatorCategories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="group rounded-xl border border-border bg-card p-5 transition hover:border-foreground/30"
              >
                <span className="flex items-center justify-between gap-3 font-heading text-xl font-medium">
                  {category.label}
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
                <span className="mt-3 block text-sm leading-6 text-muted-foreground">
                  {category.description}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="mt-16 grid gap-8 border-y border-border py-12 md:grid-cols-2"
          aria-labelledby="compare-heading"
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              A source-first way to decide
            </p>
            <h2
              id="compare-heading"
              className="mt-2 font-heading text-3xl font-medium"
            >
              Compare before you commit your time.
            </h2>
          </div>
          <ul className="space-y-4 text-sm leading-6 text-muted-foreground">
            {[
              "Check the official source and current submission path.",
              "Compare deadline, fee, eligibility, materials, and location.",
              "Treat unconfirmed details as prompts to investigate.",
              "Keep the source link visible until you are ready to apply.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <Check
                  className="mt-1 size-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16" aria-labelledby="creator-faq-heading">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Questions creators ask
          </p>
          <h2
            id="creator-faq-heading"
            className="mt-2 font-heading text-3xl font-medium"
          >
            What to know before applying.
          </h2>
          <div className="mt-6 space-y-4">
            {creatorFaqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-heading text-xl font-medium">
                  {faq.question}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
