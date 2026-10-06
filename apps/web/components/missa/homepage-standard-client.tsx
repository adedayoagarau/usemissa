"use client";

import Link from "next/link";
import { ArrowRight, BellRing, CalendarCheck, LayoutTemplate, Mail } from "lucide-react";
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

// The crop ends under the creator's name and line; the long italic statement
// would be sliced mid-line by the tile edge.
const SAMPLE = { ...sampleCreatorPortfolio(), statement: "" };

export type TileTone = "ochre" | "blue" | "lichen";

/**
 * One feature tile: a tinted panel with an icon, a statement, one link and a
 * crop of the real product bleeding out of the corner. The tile lifts on
 * hover; the crop follows a touch later.
 */
export function FeatureTile({
  id,
  tone,
  size = "large",
  icon,
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
  size?: "large" | "wide";
  icon: ReactNode;
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
        <div className={styles.tileText}>
          <span className={styles.tileIcon} aria-hidden="true">
            {icon}
          </span>
          <h3 id={headingId} className={styles.tileHeadline}>
            {headline}
          </h3>
          {children ? <div className={styles.tileCopy}>{children}</div> : null}
          <Link href={href} className={styles.tileLink}>
            {action}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
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
      icon={<CalendarCheck size={20} />}
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
      icon={<LayoutTemplate size={20} />}
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
        Writing, images and audio on one page you can share. Other creators
        can follow you and write to you from it.
      </p>
    </FeatureTile>
  );
}

function shortDate(iso: string, offsetDays = 0) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return date.toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * The reminder schedule Missa adds when a call is saved: email a week before
 * and the day before. Built from the soonest dated call open today.
 */
export function RemindersTile({
  items,
  today,
}: {
  items: DatedCall[];
  /** ISO date (YYYY-MM-DD) from the server render. */
  today: string;
}) {
  // The soonest call whose week-before reminder is still ahead, so both
  // dates in the example are ones a creator could actually receive.
  const ahead = new Date(`${today}T12:00:00Z`);
  ahead.setUTCDate(ahead.getUTCDate() + 8);
  const weekAhead = ahead.toISOString().slice(0, 10);
  const dated = items
    .filter(
      (item) =>
        item.deadline.kind === "exact" &&
        item.deadline.date &&
        Number.isFinite(Date.parse(item.deadline.date)),
    )
    .sort((a, b) => a.deadline.date!.localeCompare(b.deadline.date!));
  const call =
    dated.find((item) => item.deadline.date!.slice(0, 10) >= weekAhead) ??
    dated.at(-1);

  return (
    <FeatureTile
      id="reminders"
      tone="lichen"
      size="wide"
      icon={<BellRing size={20} />}
      headline="A nudge before it closes."
      href="/tracker"
      action="Choose your reminders"
      caption="Example, built from a call open today"
      delay={0.04}
      product={
        call ? (
          <div className={styles.reminderCrop}>
            <div className={styles.reminderCall}>
              <strong>{call.title}</strong>
              <span>Closes {shortDate(call.deadline.date!)}</span>
            </div>
            <ul className={styles.reminderList}>
              {[
                { days: 7, label: "A week before" },
                { days: 1, label: "The day before" },
              ].map(({ days, label }) => (
                <li key={days}>
                  <Mail aria-hidden="true" size={16} />
                  <span>{label}</span>
                  <time dateTime={call.deadline.date!}>
                    {shortDate(call.deadline.date!, days)}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.excerptEmpty}>
            Reminders appear here for each call you save.
          </p>
        )
      }
    >
      <p>
        Save a call and Missa emails you a week before it closes and again the
        day before. Change the timing for any call.
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
