import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { Token, Tokens } from "marked";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  Lightbulb,
  TriangleAlert,
} from "lucide-react";
import type { OpportunityBrowseProjection } from "@missa/radar-engine";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { EditorialMotif } from "@/components/missa/editorial-motif";
import { PersonAvatar } from "@/components/missa/person-avatar";
import { FeeBadge } from "@/components/missa/deadline-badges";
import { GuideChecklist } from "@/components/missa/guide-checklist";
import type { GuideArticle } from "@/lib/guideArticles";
import {
  plainText,
  smartQuotes,
  type CalloutKind,
  type CalloutToken,
  type GuideBlock,
  type GuideFaqItem,
  type GuideSource,
} from "@/lib/guideMarkdown";
import styles from "./guide-article.module.css";

const longDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatGuideDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T12:00:00Z`));
}

/* ---------- Cover ---------- */

/** Editorial cover: a collection palette and motif. Decorative only. */
export function GuideCover({
  article,
  label,
  className,
}: {
  article: Pick<GuideArticle, "palette" | "motif">;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={[styles.cover, className].filter(Boolean).join(" ")}
      data-palette={article.palette}
      aria-hidden="true"
    >
      {label ? <span className={styles.coverLabel}>{label}</span> : null}
      <EditorialMotif motif={article.motif} />
    </div>
  );
}

/* ---------- Byline ---------- */

export function GuideByline({ article }: { article: GuideArticle }) {
  const updated = article.updatedAt !== article.publishedAt;
  return (
    <div className={styles.byline}>
      <div className={styles.bylinePerson}>
        <PersonAvatar name={article.author.name} />
        <div>
          <strong>{article.author.name}</strong>
          <span>{article.author.role}</span>
        </div>
      </div>
      <ul className={styles.bylineFacts}>
        <li>
          {updated ? "Updated " : "Published "}
          <time dateTime={updated ? article.updatedAt : article.publishedAt}>
            {formatGuideDate(updated ? article.updatedAt : article.publishedAt)}
          </time>
        </li>
        <li>{article.readingMinutes} min read</li>
      </ul>
    </div>
  );
}

/* ---------- Short answer ---------- */

export function GuideAnswer({ article }: { article: GuideArticle }) {
  return (
    <section className={styles.answer} aria-labelledby="short-answer">
      <h2 id="short-answer" className={styles.answerLabel}>
        Short answer
      </h2>
      <p className={styles.answerText}>{smartQuotes(article.answer)}</p>
      {article.keyPoints.length ? (
        <ul className={styles.keyPoints} aria-label="In short">
          {article.keyPoints.map((point) => (
            <li key={point}>
              <Check aria-hidden="true" />
              <span>{smartQuotes(point)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ---------- Markdown ---------- */

function isInternal(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function Inline({ tokens }: { tokens?: Token[] }): ReactNode {
  if (!tokens) return null;
  return tokens.map((token, index) => {
    switch (token.type) {
      case "text": {
        const text = token as Tokens.Text;
        return text.tokens?.length ? (
          <Inline key={index} tokens={text.tokens} />
        ) : (
          smartQuotes(text.text)
        );
      }
      case "escape":
        return smartQuotes((token as Tokens.Escape).text);
      case "strong":
        return (
          <strong key={index}>
            <Inline tokens={(token as Tokens.Strong).tokens} />
          </strong>
        );
      case "em":
        return (
          <em key={index}>
            <Inline tokens={(token as Tokens.Em).tokens} />
          </em>
        );
      case "del":
        return (
          <del key={index}>
            <Inline tokens={(token as Tokens.Del).tokens} />
          </del>
        );
      case "codespan":
        return (
          <code key={index}>
            {(token as Tokens.Codespan).text
              .replace(/&amp;/gu, "&")
              .replace(/&lt;/gu, "<")
              .replace(/&gt;/gu, ">")
              .replace(/&quot;/gu, '"')
              .replace(/&#39;/gu, "'")}
          </code>
        );
      case "br":
        return <br key={index} />;
      case "link": {
        const link = token as Tokens.Link;
        const children = <Inline tokens={link.tokens} />;
        if (isInternal(link.href))
          return (
            <Link key={index} href={link.href}>
              {children}
            </Link>
          );
        if (link.href.startsWith("#"))
          return (
            <a key={index} href={link.href}>
              {children}
            </a>
          );
        return (
          <a key={index} href={link.href} rel="noopener">
            {children}
          </a>
        );
      }
      // Raw HTML and images are not part of the guide format.
      default:
        return null;
    }
  });
}

function ListItemContent({ item }: { item: Tokens.ListItem }) {
  return item.tokens.map((token, index) =>
    token.type === "text" ? (
      <Inline
        key={index}
        tokens={(token as Tokens.Text).tokens ?? [token]}
      />
    ) : (
      <Block key={index} block={token} checklistKey="" />
    ),
  );
}

const CALLOUT: Record<
  CalloutKind,
  { label: string; Icon: typeof Info }
> = {
  tip: { label: "Tip", Icon: Lightbulb },
  note: { label: "Note", Icon: Info },
  warning: { label: "Watch out", Icon: TriangleAlert },
};

function Block({
  block,
  checklistKey,
}: {
  block: GuideBlock;
  checklistKey: string;
}): ReactNode {
  switch (block.type) {
    case "heading": {
      const heading = block as Tokens.Heading & { id?: string };
      const content = <Inline tokens={heading.tokens} />;
      if (heading.depth === 2)
        return (
          <h2 id={heading.id} className="font-heading">
            {content}
          </h2>
        );
      if (heading.depth === 3) return <h3 id={heading.id}>{content}</h3>;
      return <h4>{content}</h4>;
    }
    case "paragraph":
      return (
        <p>
          <Inline tokens={(block as Tokens.Paragraph).tokens} />
        </p>
      );
    case "list": {
      const list = block as Tokens.List;
      if (list.items.length && list.items.every((item) => item.task))
        return (
          <GuideChecklist
            storageKey={checklistKey}
            items={list.items.map((item) => ({
              content: <ListItemContent item={item} />,
              text: plainText(item.tokens),
            }))}
          />
        );
      const items = list.items.map((item, index) => (
        <li key={index}>
          <ListItemContent item={item} />
        </li>
      ));
      return list.ordered ? (
        <ol
          className={styles.steps}
          start={typeof list.start === "number" ? list.start : undefined}
        >
          {items}
        </ol>
      ) : (
        <ul>{items}</ul>
      );
    }
    case "table": {
      const table = block as Tokens.Table;
      const labels = table.header.map((cell) => plainText(cell.tokens));
      const wide = table.header.length >= 5;
      const grid = (
        <div
          className={styles.tableWrap}
          data-wide={wide || undefined}
          style={wide ? ({ "--table-columns": table.header.length } as CSSProperties) : undefined}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {table.header.map((cell, index) => (
                  <TableHead key={index} scope="col">
                    <Inline tokens={cell.tokens} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} data-label={labels[cellIndex]}>
                      <Inline tokens={cell.tokens} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
      return wide ? (
        <div>
          <p className={styles.tableHint}>Scroll sideways to see every column.</p>
          {grid}
        </div>
      ) : (
        grid
      );
    }
    case "callout": {
      const callout = block as CalloutToken;
      const { label, Icon } = CALLOUT[callout.kind];
      return (
        <Alert role="note" data-kind={callout.kind} className={styles.callout}>
          <Icon aria-hidden="true" />
          <AlertTitle>{label}</AlertTitle>
          <AlertDescription>
            {callout.tokens
              .filter((token) => token.type !== "space")
              .map((token, index) => (
                <Block key={index} block={token} checklistKey="" />
              ))}
          </AlertDescription>
        </Alert>
      );
    }
    case "blockquote":
      return (
        <blockquote>
          {(block as Tokens.Blockquote).tokens.map((token, index) => (
            <Block key={index} block={token} checklistKey="" />
          ))}
        </blockquote>
      );
    case "hr":
      return <Separator />;
    default:
      return null;
  }
}

/** The article body, with headings, steps, checklists, tables and callouts. */
export function GuideBody({
  blocks,
  slug,
}: {
  blocks: GuideBlock[];
  slug: string;
}) {
  let checklistIndex = 0;
  return (
    <div className={styles.prose}>
      {blocks.map((block, index) => {
        const isChecklist =
          block.type === "list" &&
          (block as Tokens.List).items.every((item) => item.task);
        const key = isChecklist
          ? `missa.guide-checklist.${slug}.${checklistIndex++}`
          : "";
        return <Block key={index} block={block} checklistKey={key} />;
      })}
    </div>
  );
}

/* ---------- Questions ---------- */

export function GuideFaq({ items }: { items: GuideFaqItem[] }) {
  if (!items.length) return null;
  return (
    <section className={styles.faq} aria-labelledby="questions">
      <h2 id="questions" className={`font-heading ${styles.sectionTitle}`}>
        Frequently asked questions
      </h2>
      <Accordion multiple className={styles.faqList}>
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent hiddenUntilFound className={styles.faqAnswer}>
              {item.tokens.map((token, index) => (
                <Block key={index} block={token} checklistKey="" />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

/* ---------- Sources ---------- */

export function GuideSources({
  sources,
  checkedAt,
}: {
  sources: GuideSource[];
  checkedAt: string;
}) {
  if (!sources.length) return null;
  return (
    <Collapsible className={styles.sources}>
      <CollapsibleTrigger className={styles.sourcesTrigger}>
        Sources we checked ({sources.length})
        <ChevronDown aria-hidden="true" />
      </CollapsibleTrigger>
      <p className={styles.sourcesHint}>
        Every outside page this guide links to, checked{" "}
        {formatGuideDate(checkedAt)}. Prices and deadlines change, so confirm
        them on the organizer’s page before you pay or apply.
      </p>
      <CollapsibleContent hiddenUntilFound>
        <ol className={styles.sourceList}>
          {sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} rel="noopener">
                {source.label}
              </a>{" "}
              <span>· {source.host}</span>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ---------- Open now ---------- */

function deadlineText(item: OpportunityBrowseProjection): ReactNode {
  if (item.deadline.date)
    return (
      <>
        Closes{" "}
        <time dateTime={item.deadline.date} data-deadline>
          {formatGuideDate(item.deadline.date)}
        </time>
      </>
    );
  if (item.deadline.kind === "rolling") return "Rolling deadline";
  if (item.deadline.kind === "until-filled") return "Open until filled";
  return "Deadline not listed";
}

function FeeText({ item }: { item: OpportunityBrowseProjection }) {
  if (item.fee.status === "no-fee") return <FeeBadge noFee />;
  if (item.fee.status === "paid") {
    if (typeof item.fee.amountCents === "number")
      return (
        <FeeBadge cents={item.fee.amountCents} currency={item.fee.currency} />
      );
    return <span>{item.fee.raw ?? "Fee listed"}</span>;
  }
  return <span>Fee not listed</span>;
}

/** A few open calls that match the guide, from the live catalog. */
export function GuideOpenNow({
  title,
  items,
  unavailable,
  moreHref,
  moreLabel,
}: {
  title: string;
  items: OpportunityBrowseProjection[];
  unavailable: boolean;
  moreHref: string;
  moreLabel: string;
}) {
  return (
    <section className={styles.openNow} aria-labelledby="open-now">
      <p className={styles.sectionEyebrow}>Open now</p>
      <h2 id="open-now" className={`font-heading ${styles.sectionTitle}`}>
        {title}
      </h2>
      {items.length ? (
        <ul className={styles.callList}>
          {items.map((item) => (
            <li key={item.id}>
              <h3 className={`font-heading ${styles.callTitle}`}>
                <Link
                  href={`/opportunities/${encodeURIComponent(item.slug || item.id)}`}
                >
                  {item.title}
                </Link>
              </h3>
              <div className={styles.callMeta}>
                <span>{item.organizationName ?? "Organizer not listed"}</span>
                <span>{deadlineText(item)}</span>
                <FeeText item={item} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.sourcesHint}>
          {unavailable
            ? "Open calls can’t be shown right now. The guide still reads in full."
            : "Nothing matches this guide right now. New calls come in every week."}
        </p>
      )}
      <Link href={moreHref} className={styles.moreLink}>
        {moreLabel} <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

/* ---------- Cards ---------- */

export function GuideCard({
  article,
  headingLevel = "h3",
  featured = false,
}: {
  article: GuideArticle;
  headingLevel?: "h2" | "h3";
  featured?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <article className={featured ? styles.featured : styles.card}>
      <GuideCover
        article={article}
        label={featured ? article.section : undefined}
      />
      <div className={featured ? styles.featuredBody : styles.cardBody}>
        {featured ? null : (
          <p className={styles.cardSection}>{article.section}</p>
        )}
        <Heading className={`font-heading ${styles.cardTitle}`}>
          <Link href={`/guides/${article.slug}`}>{article.title}</Link>
        </Heading>
        <p className={styles.cardSummary}>{article.summary}</p>
        <p className={styles.cardMeta}>
          {article.readingMinutes} min read · {article.author.name}
        </p>
      </div>
    </article>
  );
}

export function GuideKeepReading({ articles }: { articles: GuideArticle[] }) {
  if (!articles.length) return null;
  return (
    <section className={styles.keepReading} aria-labelledby="keep-reading">
      <p className={styles.sectionEyebrow}>Keep reading</p>
      <h2 id="keep-reading" className={`font-heading ${styles.sectionTitle}`}>
        More guides for the second half of the job
      </h2>
      <div className={styles.cardGrid}>
        {articles.map((article) => (
          <GuideCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}

/* ---------- Closing band ---------- */

export function GuideClosing({ cta }: { cta: GuideArticle["cta"] }) {
  return (
    <section className={styles.closing} aria-labelledby="closing-heading">
      <div>
        <h2 id="closing-heading" className="font-heading">
          Find the call. Make the deadline.
        </h2>
        <p>
          Open calls, grants, residencies and magazines, with the fee, the
          rules and a reminder before each one closes.
        </p>
      </div>
      <div className={styles.closingActions}>
        <Link href={cta.href} className={buttonVariants({ size: "lg" })}>
          {cta.label}
        </Link>
        {cta.href === "/signup" ? null : (
          <Link
            href="/signup"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Get Missa free
          </Link>
        )}
      </div>
    </section>
  );
}

export { styles as guideStyles };
