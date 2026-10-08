import type { ReactNode } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { OpportunityBrowseProjectCard } from "@/components/design-system/opportunity-browse-project-card";
import { EditorialMotif } from "@/components/missa/editorial-motif";
import { PersonAvatar } from "@/components/missa/person-avatar";
import { GuideChecklist } from "@/components/missa/guide-checklist";
import { guideType } from "@/components/missa/guide-typography";
import type { GuideArticle, GuideCoverPalette } from "@/lib/guideArticles";
import {
  plainText,
  smartQuotes,
  type CalloutKind,
  type CalloutToken,
  type GuideBlock,
  type GuideFaqItem,
  type GuideSource,
} from "@/lib/guideMarkdown";
import { cn } from "@/lib/utils";

/*
 * Long-form guides on the public Spacious surface (DESIGN.md §6). Primitives
 * keep their own variants; this file adds no visual overrides to them. Layout,
 * density spacing and editorial type live on plain elements, using the token
 * utilities in app/tailwind-theme.css and the recipes in guide-typography.ts.
 */

const longDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatGuideDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T12:00:00Z`));
}

/* ---------- Section heading ---------- */

/** An eyebrow and an editorial heading, shared by every guide section. */
export function GuideSectionHeading({
  id,
  eyebrow,
  children,
}: {
  id: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow ? <p className={guideType.eyebrow}>{eyebrow}</p> : null}
      <h2 id={id} className={guideType.h2}>
        {children}
      </h2>
    </div>
  );
}

/* ---------- Cover ---------- */

// The editorial collection palette (components/design-system/collection-palette.css).
const PALETTE: Record<GuideCoverPalette, { surface: string; text: string }> = {
  fellowships: {
    surface:
      "bg-(--collection-fellowships-surface) text-(--collection-fellowships-graphic)",
    text: "text-(--collection-fellowships-text)",
  },
  grants: {
    surface:
      "bg-(--collection-grants-surface) text-(--collection-grants-graphic)",
    text: "text-(--collection-grants-text)",
  },
  poetry: {
    surface:
      "bg-(--collection-poetry-surface) text-(--collection-poetry-graphic)",
    text: "text-(--collection-poetry-text)",
  },
  residencies: {
    surface:
      "bg-(--collection-residencies-surface) text-(--collection-residencies-graphic)",
    text: "text-(--collection-residencies-text)",
  },
  "jobs-for-creators": {
    surface:
      "bg-(--collection-jobs-for-creators-surface) text-(--collection-jobs-for-creators-graphic)",
    text: "text-(--collection-jobs-for-creators-text)",
  },
};

// Media radius (DESIGN.md §7) and the motif's share of the cover per placement.
const COVER_SIZE = {
  hero: "aspect-5/2 lg:aspect-4/3 [&>svg]:w-1/5 lg:[&>svg]:w-1/2",
  card: "aspect-video [&>svg]:w-1/3",
  feature: "aspect-video md:aspect-auto md:h-full md:min-h-72 [&>svg]:w-1/3",
} as const;

/** Editorial cover: a collection palette and motif. Decorative only. */
export function GuideCover({
  article,
  label,
  size = "card",
}: {
  article: Pick<GuideArticle, "palette" | "motif">;
  label?: string;
  size?: keyof typeof COVER_SIZE;
}) {
  const palette = PALETTE[article.palette];
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-lg [&>svg]:h-auto",
        COVER_SIZE[size],
        palette.surface,
      )}
      aria-hidden="true"
    >
      {label ? (
        <span
          className={cn(
            "absolute start-4 top-4 text-xs font-semibold",
            palette.text,
          )}
        >
          {label}
        </span>
      ) : null}
      <EditorialMotif motif={article.motif} />
    </div>
  );
}

/* ---------- Byline ---------- */

export function GuideByline({ article }: { article: GuideArticle }) {
  const updated = article.updatedAt !== article.publishedAt;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-3">
        <PersonAvatar name={article.author.name} />
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-foreground">
            {article.author.name}
          </span>
          <span className="text-muted-foreground">{article.author.role}</span>
        </div>
      </div>
      <Separator orientation="vertical" className="h-8 max-sm:hidden" />
      <ul className="flex flex-col text-sm text-muted-foreground">
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
    <section aria-labelledby="short-answer">
      <Card size="lg">
        <CardHeader>
          <h2 id="short-answer" className={guideType.eyebrow}>
            Short answer
          </h2>
        </CardHeader>
        <CardContent>
          <p className="font-heading text-xl text-pretty md:text-2xl">
            {smartQuotes(article.answer)}
          </p>
        </CardContent>
        {article.keyPoints.length ? (
          <CardFooter className="block">
            <ul aria-label="In short" className="flex flex-col gap-3">
              {article.keyPoints.map((point) => (
                <li key={point} className="flex gap-3 text-base text-pretty">
                  <Check
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-primary"
                  />
                  <span>{smartQuotes(point)}</span>
                </li>
              ))}
            </ul>
          </CardFooter>
        ) : null}
      </Card>
    </section>
  );
}

/* ---------- Markdown ---------- */

/**
 * Article flow spaces blocks with the Spacious density tokens: a row between
 * paragraphs, a group before a component or subheading, a section before a
 * new heading. Compact flow (answers, callouts, list items) keeps them close.
 */
type Flow = "article" | "compact";

const FLOW: Record<
  Flow,
  { text: string; block: string; h2: string; h3: string }
> = {
  // Text keeps a reading measure; tables, cards and callouts use the column.
  article: {
    text: "mt-row max-w-2xl first:mt-0",
    block: "mt-group first:mt-0",
    h2: "mt-section max-w-2xl first:mt-0",
    h3: "mt-group max-w-2xl first:mt-0",
  },
  compact: {
    text: "mt-2 first:mt-0",
    block: "mt-3 first:mt-0",
    h2: "mt-3 first:mt-0",
    h3: "mt-3 first:mt-0",
  },
};

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
          <strong key={index} className="font-semibold">
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
          <code key={index} className={guideType.code}>
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
            <Link key={index} href={link.href} className={guideType.link}>
              {children}
            </Link>
          );
        if (link.href.startsWith("#"))
          return (
            <a key={index} href={link.href} className={guideType.link}>
              {children}
            </a>
          );
        return (
          <a
            key={index}
            href={link.href}
            rel="noopener"
            className={cn(guideType.link, "wrap-break-word")}
          >
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
      <Inline key={index} tokens={(token as Tokens.Text).tokens ?? [token]} />
    ) : (
      <Block key={index} block={token} checklistKey="" flow="compact" />
    ),
  );
}

const CALLOUT: Record<CalloutKind, { label: string; Icon: typeof Info }> = {
  tip: { label: "Tip", Icon: Lightbulb },
  note: { label: "Note", Icon: Info },
  warning: { label: "Watch out", Icon: TriangleAlert },
};

/**
 * A comparison table. Up to a 36rem column every table reads as labelled
 * records, one per row; wider, it is a ruled table, and six or more columns
 * scroll sideways inside a focusable, named region.
 */
function GuideTable({
  table,
  className,
}: {
  table: Tokens.Table;
  className: string;
}) {
  const labels = table.header.map((cell) => plainText(cell.tokens));
  const wide = table.header.length >= 6;
  return (
    <div className={cn("@container", className)}>
      {wide ? (
        <p className={cn(guideType.muted, "mb-2 hidden @xl:@max-3xl:block")}>
          Scroll sideways to see every column.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table
          scrollLabel={
            wide ? `Table comparing ${labels.join(", ")}` : undefined
          }
          className={cn("@max-xl:block", wide && "@xl:min-w-3xl")}
        >
          <TableHeader className="@max-xl:sr-only">
            <TableRow variant="static">
              {table.header.map((cell, index) => (
                <TableHead
                  key={index}
                  scope="col"
                  className={cn(
                    "h-auto py-3 align-bottom whitespace-normal",
                    wide && "px-2 first:ps-3",
                  )}
                >
                  <Inline tokens={cell.tokens} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="@max-xl:block">
            {table.rows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className="@max-xl:block @max-xl:px-4 @max-xl:py-3"
              >
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <TableCell
                      key={cellIndex}
                      className={cn(
                        "py-3 align-top font-semibold whitespace-normal @max-xl:block @max-xl:px-0 @max-xl:pt-0 @max-xl:pb-2 @max-xl:text-base",
                        wide && "@xl:ps-3 @xl:pe-2",
                      )}
                    >
                      <Inline tokens={cell.tokens} />
                    </TableCell>
                  ) : (
                    <TableCell
                      key={cellIndex}
                      className={cn(
                        "py-3 align-top whitespace-normal @max-xl:grid @max-xl:grid-cols-[minmax(5.5rem,36%)_minmax(0,1fr)] @max-xl:gap-3 @max-xl:px-0 @max-xl:py-1",
                        wide && "@xl:px-2",
                      )}
                    >
                      <span className="hidden text-xs font-semibold text-muted-foreground @max-xl:block">
                        {labels[cellIndex]}
                      </span>
                      <span>
                        <Inline tokens={cell.tokens} />
                      </span>
                    </TableCell>
                  ),
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Block({
  block,
  checklistKey,
  flow,
}: {
  block: GuideBlock;
  checklistKey: string;
  flow: Flow;
}): ReactNode {
  const space = FLOW[flow];
  switch (block.type) {
    case "heading": {
      const heading = block as Tokens.Heading & { id?: string };
      const content = <Inline tokens={heading.tokens} />;
      if (heading.depth === 2)
        return (
          <h2 id={heading.id} className={cn(guideType.h2, space.h2)}>
            {content}
          </h2>
        );
      if (heading.depth === 3)
        return (
          <h3 id={heading.id} className={cn(guideType.h3, space.h3)}>
            {content}
          </h3>
        );
      return <h4 className={cn(guideType.h4, space.h3)}>{content}</h4>;
    }
    case "paragraph":
      return (
        <p className={cn(flow === "article" && guideType.body, space.text)}>
          <Inline tokens={(block as Tokens.Paragraph).tokens} />
        </p>
      );
    case "list": {
      const list = block as Tokens.List;
      if (list.items.length && list.items.every((item) => item.task))
        return (
          <div className={space.block}>
            <GuideChecklist
              storageKey={checklistKey}
              items={list.items.map((item) => ({
                content: <ListItemContent item={item} />,
                text: plainText(item.tokens),
              }))}
            />
          </div>
        );
      if (list.ordered) {
        const start = typeof list.start === "number" ? list.start : 1;
        // Numbered steps. role="list" keeps list semantics in Safari once
        // the markers are replaced by the drawn numbers.
        return (
          <ol
            role="list"
            start={start}
            className={cn(
              "flex flex-col gap-4",
              flow === "article" && cn(guideType.body, "max-w-2xl"),
              space.block,
            )}
          >
            {list.items.map((item, index) => (
              <li key={index} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-sm tabular-nums"
                >
                  {start + index}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <ListItemContent item={item} />
                </div>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul
          className={cn(
            guideType.list,
            flow === "article" && guideType.body,
            space.text,
          )}
        >
          {list.items.map((item, index) => (
            <li key={index}>
              <ListItemContent item={item} />
            </li>
          ))}
        </ul>
      );
    }
    case "table":
      return (
        <GuideTable table={block as Tokens.Table} className={space.block} />
      );
    case "callout": {
      const callout = block as CalloutToken;
      const { label, Icon } = CALLOUT[callout.kind];
      return (
        <div className={space.block}>
          <Alert role="note">
            <Icon aria-hidden="true" />
            <AlertTitle>{label}</AlertTitle>
            <AlertDescription>
              {callout.tokens
                .filter((token) => token.type !== "space")
                .map((token, index) => (
                  <Block
                    key={index}
                    block={token}
                    checklistKey=""
                    flow="compact"
                  />
                ))}
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    case "blockquote":
      return (
        <blockquote className={cn(guideType.quote, "max-w-2xl", space.block)}>
          {(block as Tokens.Blockquote).tokens.map((token, index) => (
            <Block key={index} block={token} checklistKey="" flow="compact" />
          ))}
        </blockquote>
      );
    case "hr":
      return (
        <div className={space.block}>
          <Separator />
        </div>
      );
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
    <div className="text-foreground">
      {blocks.map((block, index) => {
        const isChecklist =
          block.type === "list" &&
          (block as Tokens.List).items.every((item) => item.task);
        const key = isChecklist
          ? `missa.guide-checklist.${slug}.${checklistIndex++}`
          : "";
        return (
          <Block key={index} block={block} checklistKey={key} flow="article" />
        );
      })}
    </div>
  );
}

/* ---------- Questions ---------- */

export function GuideFaq({ items }: { items: GuideFaqItem[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="questions" className="flex flex-col gap-group">
      <GuideSectionHeading id="questions">
        Frequently asked questions
      </GuideSectionHeading>
      <Accordion multiple>
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent hiddenUntilFound>
              {item.tokens.map((token, index) => (
                <Block
                  key={index}
                  block={token}
                  checklistKey=""
                  flow="compact"
                />
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
    <Collapsible variant="sectionSpacious" className="flex flex-col gap-2">
      <CollapsibleTrigger
        render={
          <Button variant="disclosure" className="w-full justify-between" />
        }
      >
        Sources we checked ({sources.length})
        <ChevronDown
          aria-hidden="true"
          className="transition-transform in-data-panel-open:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <p className={cn(guideType.muted, "px-4")}>
        Every outside page this guide links to, checked{" "}
        {formatGuideDate(checkedAt)}. Prices and deadlines change, so confirm
        them on the organizer’s page before you pay or apply.
      </p>
      <CollapsibleContent hiddenUntilFound className="px-4 pt-2">
        <ol className="ms-5 list-decimal space-y-2 text-sm marker:text-muted-foreground">
          {sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                rel="noopener"
                className={cn(guideType.link, "wrap-break-word")}
              >
                {source.label}
              </a>{" "}
              <span className="text-muted-foreground">· {source.host}</span>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ---------- Open now ---------- */

/**
 * A few open calls that match the guide, from the live catalog, on the same
 * card the discovery collections use.
 */
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
    <section aria-labelledby="open-now" className="flex flex-col gap-group">
      <GuideSectionHeading id="open-now" eyebrow="Open now">
        {title}
      </GuideSectionHeading>
      {items.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="grid">
              <OpportunityBrowseProjectCard item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <Card variant="empty">
          <CardContent>
            <p className={guideType.muted}>
              {unavailable
                ? "Open calls can’t be shown right now. The guide still reads in full."
                : "Nothing matches this guide right now. New calls come in every week."}
            </p>
          </CardContent>
        </Card>
      )}
      <div>
        <Link
          href={moreHref}
          className={buttonVariants({ variant: "outline" })}
        >
          {moreLabel} <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* ---------- Cards ---------- */

/** A guide on the index or under an article: the Studio card-05 anatomy. */
export function GuideCard({
  article,
  headingLevel = "h3",
}: {
  article: GuideArticle;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <Card variant="interactive" size="lg" className="relative h-full">
      <div className="px-(--card-spacing)">
        <GuideCover article={article} />
      </div>
      <CardHeader className="gap-2">
        <p className={guideType.caption}>{article.section}</p>
        <CardTitle className="text-xl font-medium text-balance">
          <Heading>
            <Link
              href={`/guides/${article.slug}`}
              className="after:absolute after:inset-0"
            >
              {article.title}
            </Link>
          </Heading>
        </CardTitle>
        <CardDescription>{article.summary}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="text-xs text-muted-foreground">
          {article.readingMinutes} min read · {article.author.name}
        </p>
      </CardContent>
    </Card>
  );
}

/** The lead guide on the index: the Studio card-06 horizontal anatomy. */
export function GuideFeaturedCard({ article }: { article: GuideArticle }) {
  return (
    <Card variant="interactive" size="lg" className="relative md:flex-row">
      <div className="px-(--card-spacing) md:w-1/2 md:pe-0">
        <GuideCover article={article} label={article.section} size="feature" />
      </div>
      <div className="flex flex-col justify-center gap-4 px-(--card-spacing) md:w-1/2 md:ps-0 md:pe-10">
        <p className={guideType.eyebrow}>Start here</p>
        <h2 className="font-heading text-3xl font-medium tracking-tight text-balance md:text-4xl">
          <Link
            href={`/guides/${article.slug}`}
            className="after:absolute after:inset-0"
          >
            {article.title}
          </Link>
        </h2>
        <p className="text-base text-pretty text-muted-foreground md:text-lg">
          {article.summary}
        </p>
        <p className="text-xs text-muted-foreground">
          {article.readingMinutes} min read · {article.author.name}
        </p>
      </div>
    </Card>
  );
}

export function GuideKeepReading({ articles }: { articles: GuideArticle[] }) {
  if (!articles.length) return null;
  return (
    <section aria-labelledby="keep-reading" className="flex flex-col gap-group">
      <GuideSectionHeading id="keep-reading" eyebrow="Keep reading">
        More guides for the second half of the job
      </GuideSectionHeading>
      <ul className="grid gap-gap sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <GuideCard article={article} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Closing band ---------- */

export function GuideClosing({ cta }: { cta: GuideArticle["cta"] }) {
  return (
    <section aria-labelledby="closing-heading">
      <Card variant="muted" size="lg">
        <div className="flex flex-col gap-gap px-(--card-spacing) md:flex-row md:items-center md:justify-between md:py-4">
          <div className="flex flex-col gap-2">
            <h2
              id="closing-heading"
              className="font-heading text-2xl font-medium tracking-tight text-balance md:text-3xl"
            >
              Find the call. Make the deadline.
            </h2>
            <p className="max-w-xl text-base text-pretty text-muted-foreground">
              Open calls, grants, residencies and magazines, with the fee, the
              rules and a reminder before each one closes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:shrink-0">
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
        </div>
      </Card>
    </section>
  );
}
