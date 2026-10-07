/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { Item, ItemContent, ItemMedia } from "@/components/ui/item";
import { ProvenanceBadge } from "@/components/missa/provenance-badge";
import { cn } from "@/lib/utils";
import type {
  PortfolioData,
  PortfolioRecordItem,
  PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import {
  recordEntryDetail,
  recordEntryForWork,
  stanzas,
  workAddressText,
  workContents,
  workCountsLine,
  workHref,
  workNeighbours,
  workParts,
  workRights,
  workSlug,
} from "@/lib/creator-work-page";
import { initials } from "@/lib/creator-profile";
import "@/components/design-system/creator-palette.css";
import styles from "./work-page.module.css";
import { Recording, WorkParts } from "./work-parts";
import { WorkPagePlayer } from "./recording-player";
import { PlateImage } from "./plate-image";
import { WorkContents } from "./work-contents";
import { RightsLine, WorkPageActions } from "./work-page-actions";
import { ExternalLink, hostname, safeHref } from "./links";
import { PublisherCard } from "./publisher-card";

const LONG_TITLE = 60;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Who published it: the entry's venue, linked to the directory or the publication. */
function Venue({ entry }: { entry: PortfolioRecordItem }) {
  const name = entry.organization?.name || entry.venue;
  if (!name) return null;
  if (entry.organization?.href)
    return <Link href={entry.organization.href}>{name}</Link>;
  const href = safeHref(entry.url);
  return href ? <ExternalLink href={href}>{name}</ExternalLink> : <>{name}</>;
}

function Neighbour({
  direction,
  work,
  href,
}: {
  direction: "previous" | "next";
  work: PortfolioWork;
  href: string;
}) {
  return (
    <Item
      variant="outline"
      className={styles.neighbour}
      data-direction={direction}
      render={<Link href={href} />}
    >
      {work.image && (
        <ItemMedia>
          <img src={work.image} alt="" loading="lazy" />
        </ItemMedia>
      )}
      <ItemContent className={styles.neighbourText}>
        <span className={styles.neighbourLabel}>
          {direction === "previous" ? "Previous" : "Next"}
        </span>
        <span className={cn(styles.neighbourTitle, "font-heading")}>
          {work.title}
        </span>
      </ItemContent>
    </Item>
  );
}

/**
 * One work of a creator's, on its own page at /@handle/<address>. The page
 * follows the creator's theme and reads in the same type as the profile. Parts
 * come in the order the creator set; the counts line and the contents list
 * appear only when there is more than one.
 *
 * Content rules, so what the page says is what the work is:
 * - A work with parts shows its parts. Its own text and audio stay on the
 *   profile card, and its picture opens the page.
 * - A work with no parts shows its own text, picture and audio.
 * - "Published in" is the publication on the track record that names the work.
 */
export function CreatorWorkPage({
  portfolio,
  work,
  handle,
  sample = false,
  theme,
}: {
  /** The published profile, as visitors see it. */
  portfolio: PortfolioData;
  /** A work from `portfolio.works`. */
  work: PortfolioWork;
  handle: string;
  /** Design reviews: contact and follow stay inert. */
  sample?: boolean;
  /** Reviews may preview a palette other than the stored one. */
  theme?: string;
}) {
  const works = portfolio.works;
  const index = works.indexOf(work);
  const name = portfolio.name.trim() || `@${handle}`;
  const first = firstName(name);
  const parts = workParts(work);
  const many = parts.length > 1;
  const counts = workCountsLine(work);
  const contents = workContents(work);
  const record = recordEntryForWork(work, portfolio.record);
  const detail = record ? recordEntryDetail(work, record) : "";
  const slug = workSlug(work, works);
  const profileHref = `/@${handle}`;
  const contactHref = portfolio.contact.email
    ? `mailto:${portfolio.contact.email}`
    : undefined;
  const canContact = portfolio.inquiries || Boolean(contactHref);
  const rights = workRights(work, name, canContact);
  const { previous, next } = workNeighbours(works, index);
  const previousHref = previous && workHref(handle, previous, works);
  const nextHref = next && workHref(handle, next, works);
  const link = safeHref(work.url);
  const credits = work.credits.filter((credit) => credit.name.trim());
  const about = stanzas(work.about);
  const showsOwnText = parts.length === 0 && Boolean(work.text.trim());
  const showsOwnAudio = parts.length === 0 && Boolean(work.audio);
  const hasBody =
    parts.length > 0 || showsOwnText || showsOwnAudio || Boolean(link);
  const hasContext = about.length > 0 || credits.length > 0 || Boolean(record);
  const facts: Array<{ label: string; value: React.ReactNode }> = [];
  if (work.year.trim())
    facts.push({
      label: "Year",
      value: <span className="font-mono">{work.year.trim()}</span>,
    });
  if (record)
    facts.push({
      label: "Published in",
      value: (
        <>
          <span>
            <Venue entry={record} />
            {detail ? `, ${detail}` : ""}
          </span>
          <ProvenanceBadge
            className={styles.chip}
            provenance={record.provenance}
            creator={first}
            organization={record.organization?.name || record.venue}
          />
        </>
      ),
    });
  if (work.madeDuring.trim())
    facts.push({ label: "Made during", value: work.madeDuring.trim() });
  if (work.supportedBy.trim())
    facts.push({ label: "Supported by", value: work.supportedBy.trim() });

  return (
    <div
      className={styles.world}
      data-creator-theme={theme ?? portfolio.theme}
      data-lens={portfolio.lens}
    >
      <WorkPagePlayer cover={work.image}>
        {sample && (
          <p className={styles.sampleNote}>Fictional creator · design study</p>
        )}
        <div className={styles.container}>
          <div className={styles.bar}>
            <Breadcrumb className={styles.crumbs}>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href={profileHref} />}>
                    <span className={styles.crumbMark}>
                      {portfolio.photo ? (
                        <img src={portfolio.photo} alt="" />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={cn(styles.monogram, "font-heading")}
                        >
                          {initials(name).slice(0, 1)}
                        </span>
                      )}
                      {name}
                    </span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={<Link href={`${profileHref}#profile-work`} />}
                  >
                    Work
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{work.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <WorkPageActions
              title={work.title}
              name={name}
              handle={handle}
              inquiries={portfolio.inquiries}
              contactHref={contactHref}
              sample={sample}
            />
          </div>

          <main id="main-content">
            <header className={styles.head}>
              {(work.kind.trim() || counts) && (
                <div>
                  {work.kind.trim() && (
                    <p className={styles.kind}>{work.kind.trim()}</p>
                  )}
                  {counts && (
                    <p className={cn(styles.counts, "font-mono")}>{counts}</p>
                  )}
                </div>
              )}
              <h1
                className={cn(styles.title, "font-heading")}
                data-long={work.title.length > LONG_TITLE ? "" : undefined}
              >
                {work.title}
              </h1>
              {work.summary.trim() && (
                <p className={cn(styles.standfirst, "font-heading")}>
                  {work.summary.trim()}
                </p>
              )}
              {facts.length > 0 && (
                <dl className={styles.facts}>
                  {facts.map((fact) => (
                    <div key={fact.label} className={styles.fact}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </header>

            {work.image && (
              <figure className={styles.cover}>
                <div className={styles.coverFrame}>
                  <PlateImage src={work.image} alt={work.caption} eager />
                </div>
              </figure>
            )}

            {hasBody ? (
              <div className={styles.body} data-solo={many ? undefined : ""}>
                {many && <WorkContents items={contents} />}
                {parts.length > 0 ? (
                  <WorkParts parts={parts} />
                ) : (
                  <div className={styles.parts}>
                    {showsOwnText && (
                      <div className={cn(styles.reading, "font-heading")}>
                        {stanzas(work.text).map((block, at) => (
                          <p key={at}>{block}</p>
                        ))}
                      </div>
                    )}
                    {showsOwnAudio && (
                      <Recording
                        label="Recording"
                        title="Listen"
                        src={work.audio}
                      />
                    )}
                  </div>
                )}
                {link && (
                  <ExternalLink
                    href={link}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-fit no-underline",
                    )}
                  >
                    Open on {hostname(link)}
                    <ArrowUpRight aria-hidden="true" />
                  </ExternalLink>
                )}
              </div>
            ) : (
              !work.image &&
              !hasContext && (
                <p className={styles.empty}>
                  {first} hasn’t added anything to this page yet.
                </p>
              )
            )}

            {hasContext && (
              <section
                className={styles.context}
                data-solo={record ? undefined : ""}
                aria-label="About this work"
              >
                <div className={styles.contextMain}>
                  <h2 className={cn(styles.sectionTitle, "font-heading")}>
                    {about.length > 0 ? "About this work" : "Credits"}
                  </h2>
                  {about.length > 0 && (
                    <div className={styles.about}>
                      {about.map((block, at) => (
                        <p key={at}>{block}</p>
                      ))}
                    </div>
                  )}
                  {credits.length > 0 && (
                    <>
                      {about.length > 0 && (
                        <h3 className={styles.creditsTitle}>Credits</h3>
                      )}
                      <dl className={styles.credits}>
                        {credits.map((credit, at) => {
                          const href = safeHref(credit.url);
                          return (
                            <div key={at} className={styles.creditRow}>
                              <dt>{credit.role.trim() || "Credit"}</dt>
                              <dd>
                                {href ? (
                                  <ExternalLink href={href}>
                                    {credit.name}
                                  </ExternalLink>
                                ) : (
                                  credit.name
                                )}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </>
                  )}
                </div>
                {record && <PublisherCard entry={record} creator={first} />}
              </section>
            )}

            {(previous || next) && (
              <nav aria-label="More work" className={styles.neighbours}>
                {previous && previousHref && (
                  <Neighbour
                    direction="previous"
                    work={previous}
                    href={previousHref}
                  />
                )}
                {next && nextHref && (
                  <Neighbour direction="next" work={next} href={nextHref} />
                )}
              </nav>
            )}

            <RightsLine
              notice={rights.notice}
              ask={rights.ask}
              title={work.title}
              address={workAddressText(handle, slug)}
            />
          </main>
        </div>
      </WorkPagePlayer>
    </div>
  );
}
