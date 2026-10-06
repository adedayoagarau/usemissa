"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck, LayoutTemplate } from "lucide-react";
import type { ReactNode } from "react";
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
import { Reveal } from "./homepage-reveal";
import styles from "./homepage-standard.module.css";

type DatedCall = Pick<
  OpportunityBrowseProjection,
  "id" | "title" | "organizationName" | "deadline"
>;

const SAMPLE = sampleCreatorPortfolio();

export type TileTone = "ochre" | "blue" | "lichen" | "forest" | "neutral";

/**
 * One feature tile: a tinted panel with a labelled icon, a statement, one
 * link and, for the two product tiles, a crop of the real product bleeding
 * out of the corner. The tile lifts on hover; the crop follows a touch later.
 */
export function FeatureTile({
  id,
  tone,
  size = "small",
  icon,
  label,
  headline,
  children,
  href,
  action,
  caption,
  product,
  delay = 0,
}: {
  id: string;
  tone: TileTone;
  size?: "small" | "large";
  icon: ReactNode;
  label: string;
  headline: string;
  children?: ReactNode;
  href: string;
  action: string;
  caption?: string;
  product?: ReactNode;
  delay?: number;
}) {
  const headingId = `homepage-tile-${id}`;
  return (
    <Reveal className={styles.tileSlot} delay={delay}>
      <article
        className={styles.tile}
        data-tone={tone}
        data-size={size}
        aria-labelledby={headingId}
      >
        <div className={styles.tileHead}>
          <span className={styles.tileIcon} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.tileLabel}>{label}</span>
        </div>
        <h3 id={headingId} className={styles.tileHeadline}>
          {headline}
        </h3>
        {children ? <div className={styles.tileCopy}>{children}</div> : null}
        <Link href={href} className={styles.tileLink}>
          {action}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
        {product ? (
          <div className={styles.tileProduct}>
            {caption ? <p className={styles.tileCaption}>{caption}</p> : null}
            {product}
          </div>
        ) : null}
      </article>
    </Reveal>
  );
}

/** The Tracker's deadline view, built from today's catalogue and labelled as such. */
export function TrackerTile({ items }: { items: DatedCall[] }) {
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
    <FeatureTile
      id="tracker"
      tone="ochre"
      size="large"
      icon={<CalendarCheck size={20} />}
      label="Tracker"
      headline="Keep every deadline in one view."
      href="/tracker"
      action="Open your Tracker"
      caption="Example, built from calls open today"
      product={
        dated.length ? (
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
        )
      }
    >
      <p>
        Save a call and its deadline stays here, on your calendar if you want
        it, with your notes beside it.
      </p>
    </FeatureTile>
  );
}

/** One framed crop of the sample portfolio, never the whole page. */
export function PortfolioTile() {
  return (
    <FeatureTile
      id="portfolio"
      tone="blue"
      size="large"
      icon={<LayoutTemplate size={20} />}
      label="Portfolio"
      headline="One page for the work you make."
      href="/profile/portfolio"
      action="Build your portfolio"
      caption="Example, a fictional creator"
      delay={0.08}
      product={
        <div className={styles.portfolioFrame} aria-hidden="true" inert>
          <PublicCreatorProfile
            portfolio={SAMPLE}
            mode="embedded"
            sample
            theme="white"
            workLimit={1}
          />
        </div>
      }
    >
      <p>
        Writing, images and audio on one page you can share. You decide when
        it is public.
      </p>
    </FeatureTile>
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
        <AccordionItem key={q} value={`question-${index}`} className={styles.questionItem}>
          <AccordionTrigger className={styles.questionTrigger}>{q}</AccordionTrigger>
          <AccordionContent className={styles.questionContent}>
            <p>{a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
