"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PublicCreatorProfile } from "@/components/creator-profile/public-profile";
import { sampleCreatorPortfolio } from "@/lib/creator-profile-sample";
import styles from "./homepage-standard.module.css";

type DatedCall = Pick<
  OpportunityBrowseProjection,
  "id" | "title" | "organizationName" | "deadline"
>;

const SAMPLE = sampleCreatorPortfolio();

/** The Tracker's deadline view, built from today's catalogue and labelled as such. */
export function TrackerExcerpt({ items }: { items: DatedCall[] }) {
  const dated = items
    .filter(
      (item) =>
        item.deadline.kind === "exact" &&
        item.deadline.date &&
        Number.isFinite(Date.parse(item.deadline.date)),
    )
    .sort((a, b) => a.deadline.date!.localeCompare(b.deadline.date!))
    .slice(0, 3);

  return (
    <article className={styles.excerpt} aria-labelledby="homepage-tracker-heading">
      <div className={styles.excerptHead}>
        <h3 id="homepage-tracker-heading">Tracker</h3>
        <p className={styles.excerptLabel}>
          Example, built from calls open today
        </p>
      </div>
      <div className={styles.excerptBody}>
        {dated.length ? (
          <Table className={styles.deadlineTable}>
            <TableHeader>
              <TableRow>
                <TableHead>Deadline</TableHead>
                <TableHead>Call</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dated.map((item) => {
                const date = new Date(`${item.deadline.date!.slice(0, 10)}T12:00:00Z`);
                return (
                  <TableRow key={item.id}>
                    <TableCell className={styles.deadlineCell}>
                      <time dateTime={item.deadline.date!}>
                        {date.toLocaleDateString("en", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </time>
                    </TableCell>
                    <TableCell className={styles.deadlineTitle}>
                      <Link href={`/opportunities/${encodeURIComponent(item.id)}`}>
                        {item.title}
                      </Link>
                      {item.organizationName ? <p>{item.organizationName}</p> : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className={styles.excerptEmpty}>
            Calls with a dated deadline appear here with the date kept beside
            them.
          </p>
        )}
        <p className={styles.excerptNote}>
          Save a call and its deadline stays here, on your calendar if you want
          it, with your notes beside it.
        </p>
      </div>
      <div className={styles.excerptFoot}>
        <Link href="/tracker" className={styles.textLink}>
          Open your Tracker <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </article>
  );
}

/** One framed excerpt of the sample portfolio, never the whole page. */
export function PortfolioExcerpt() {
  return (
    <article className={styles.excerpt} aria-labelledby="homepage-portfolio-heading">
      <div className={styles.excerptHead}>
        <h3 id="homepage-portfolio-heading">Portfolio</h3>
        <p className={styles.excerptLabel}>Example, a fictional creator</p>
      </div>
      <div className={styles.excerptFrame} aria-hidden="true" inert>
        <PublicCreatorProfile
          portfolio={SAMPLE}
          mode="embedded"
          sample
          theme="white"
          workLimit={1}
        />
      </div>
      <div className={styles.excerptFoot}>
        <p className={styles.excerptNote}>
          One page for your writing, images and audio. You decide when it is
          public.
        </p>
        <Link href="/profile/portfolio" className={styles.textLink}>
          Build your portfolio <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </article>
  );
}

const QUESTIONS = [
  {
    q: "Do I need an account?",
    a: "No. Browse opportunities and read the details without an account. Create one to keep a shortlist, track deadlines and build a portfolio.",
  },
  {
    q: "Where do I apply?",
    a: "Open an opportunity and follow the link to the organizer’s official page. Each organizer sets its own requirements and handles submissions.",
  },
  {
    q: "Are all applications free?",
    a: "Some organizers charge a fee. Use the no-fee filter to find opportunities without an application fee.",
  },
  {
    q: "How do I check whether I’m eligible?",
    a: "Read the eligibility rules and submission guidelines on the opportunity page. Check the organizer’s website for any missing details.",
  },
  {
    q: "Can I search more than one discipline?",
    a: "Yes. You can select several disciplines and change them at any time.",
  },
  {
    q: "Is my portfolio public?",
    a: "Your draft stays private until you publish it.",
  },
];

export function HomepageQuestions() {
  return (
    <Accordion className={styles.questions}>
      {QUESTIONS.map(({ q, a }, index) => (
        <AccordionItem key={q} value={`question-${index}`}>
          <AccordionTrigger className={styles.questionTrigger}>{q}</AccordionTrigger>
          <AccordionContent className={styles.questionContent}>
            <p>{a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
