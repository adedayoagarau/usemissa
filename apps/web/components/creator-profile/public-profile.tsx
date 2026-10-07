"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  Download,
  Globe,
  Mail,
  MapPin,
  Share,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AvailabilityChip } from "@/components/missa/availability-chip";
import { ProvenanceBadge } from "@/components/missa/provenance-badge";
import { ProfileConnect } from "./profile-connect";
import { cn } from "@/lib/utils";
import {
  activeModules,
  isAddonModule,
  type PortfolioData,
  type PortfolioModule,
  type PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import {
  EVENT_STATUS_COPY,
  MODULE_LABELS,
  MODULE_NAV_LABELS,
  eventCalendarFile,
  eventDateParts,
  featuredWork,
  firstLines,
  initials,
  upcomingEvents,
  workFormats,
} from "@/lib/creator-profile";
import "@/components/design-system/creator-palette.css";
import styles from "./public-profile.module.css";
import { ADDON_SECTIONS } from "./sections";
import { Heading, SectionHead, hostname, safeHref } from "./sections/shared";
import type { ProfileMode } from "./sections/types";
import {
  MiniPlayer,
  PlayButton,
  WorkDialog,
  WorkSection,
  useAudioPlayer,
  useWorkViewer,
  type Player,
} from "./work-media";

export type { ProfileMode };

function practiceLine(practices: string[]) {
  const items = practices
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) =>
      index > 0 && /^[A-Z][a-z]/.test(item)
        ? item[0].toLowerCase() + item.slice(1)
        : item,
    );
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "this creator";
}

export function PublicCreatorProfile({
  portfolio,
  handle,
  mode = "page",
  sample = false,
  workLimit,
  today,
  theme,
}: {
  portfolio: PortfolioData;
  handle?: string;
  mode?: ProfileMode;
  sample?: boolean;
  workLimit?: number;
  today?: string;
  /** Marketing samples may preview palette names the schema doesn't store. */
  theme?: string;
}) {
  const date = today ?? new Date().toISOString().slice(0, 10);
  const level = mode === "page" ? 1 : mode === "preview" ? 2 : 3;
  const name = portfolio.name.trim() || "Your name";
  const first = firstName(name);
  const works = workLimit
    ? portfolio.works.slice(0, workLimit)
    : portfolio.works;
  const featured = featuredWork(works);
  // The portrait hero already shows the featured work; don't repeat it below.
  const heroShowsFeatured = portfolio.hero === "portrait" && Boolean(featured);
  const gridWorks = heroShowsFeatured
    ? works.filter((work) => work !== featured)
    : works;
  const events = upcomingEvents(portfolio.events, date);
  const player = useAudioPlayer();
  const viewer = useWorkViewer();
  const address = handle || portfolio.handle;
  const contactHref = portfolio.contact.email
    ? `mailto:${portfolio.contact.email}`
    : undefined;
  const filled = (id: PortfolioModule): boolean => {
    if (isAddonModule(id)) return ADDON_SECTIONS[id].filled(portfolio, date);
    switch (id) {
      case "work":
        return gridWorks.length > 0;
      case "upcoming":
        return events.length > 0;
      case "shelf":
        return portfolio.shelf.length > 0;
      case "record":
        return portfolio.record.length > 0;
      case "press":
        return portfolio.press.length > 0;
      case "about":
        return Boolean(
          portfolio.bio.trim() ||
          contactHref ||
          portfolio.contact.website ||
          portfolio.contact.instagram ||
          portfolio.contact.newsletter,
        );
    }
  };
  // Embedded marketing samples show identity and work only.
  const modules = activeModules(portfolio.modules).filter(
    (module) =>
      module.visible &&
      filled(module.id) &&
      (mode !== "embedded" || module.id === "work"),
  );
  const Container = mode === "page" ? "main" : "div";
  const sectionId = (id: PortfolioModule) =>
    mode === "page" ? `profile-${id}` : undefined;

  return (
    <div
      className={cn(styles.world, styles[`mode_${mode}`])}
      data-creator-theme={theme ?? portfolio.theme}
      data-lens={portfolio.lens}
    >
      {sample && (
        <p className={styles.sampleNote}>Fictional creator · design study</p>
      )}
      <Container
        id={mode === "page" ? "main-content" : undefined}
        className={styles.container}
      >
        <IdentityHeader
          portfolio={portfolio}
          name={name}
          address={address}
          level={level}
          featured={featured}
          date={date}
          contactHref={contactHref}
          hasRecord={portfolio.record.length > 0}
          sample={sample}
          mode={mode}
          onOpen={viewer.open}
          player={player}
        />
        {mode === "page" && modules.length > 1 && (
          <nav aria-label="Profile sections" className={styles.sectionNav}>
            {modules.map((module) => (
              <a key={module.id} href={`#profile-${module.id}`}>
                {MODULE_NAV_LABELS[module.id] ?? MODULE_LABELS[module.id]}
                {module.id === "work" && (
                  <span className="font-mono">{works.length}</span>
                )}
                {module.id === "record" && (
                  <span className="font-mono">{portfolio.record.length}</span>
                )}
              </a>
            ))}
          </nav>
        )}
        {modules.map((module) => {
          const id = sectionId(module.id);
          switch (module.id) {
            case "work":
              return (
                <WorkSection
                  key="work"
                  id={id}
                  works={gridWorks}
                  total={portfolio.works.length}
                  lens={portfolio.lens}
                  level={level + 1}
                  onOpen={viewer.open}
                  player={player}
                />
              );
            case "upcoming":
              return (
                <UpcomingSection
                  key="upcoming"
                  id={id}
                  events={events}
                  creator={name}
                  level={level + 1}
                />
              );
            case "shelf":
              return (
                <ShelfSection
                  key="shelf"
                  id={id}
                  portfolio={portfolio}
                  level={level + 1}
                />
              );
            case "record":
              return (
                <RecordSection
                  key="record"
                  id={id}
                  portfolio={portfolio}
                  name={name}
                  address={address}
                  level={level + 1}
                  mode={mode}
                />
              );
            case "press":
              return (
                <PressSection
                  key="press"
                  id={id}
                  portfolio={portfolio}
                  level={level + 1}
                />
              );
            case "about":
              return (
                <AboutSection
                  key="about"
                  id={id}
                  portfolio={portfolio}
                  name={name}
                  first={first}
                  contactHref={contactHref}
                  level={level + 1}
                  sample={sample}
                />
              );
            default: {
              const { Section } = ADDON_SECTIONS[module.id];
              return (
                <Section
                  key={module.id}
                  id={id}
                  portfolio={portfolio}
                  name={name}
                  address={address}
                  level={level + 1}
                  mode={mode}
                  today={date}
                  canContact={portfolio.inquiries || Boolean(contactHref)}
                />
              );
            }
          }
        })}
        {modules.length === 0 && !featured && (
          <p className={styles.quietEmpty}>
            {first} hasn’t added work to this profile yet.
          </p>
        )}
      </Container>
      {mode === "page" && (
        <footer className={styles.footer}>
          {address && (
            <span className="font-mono">usemissa.com/@{address}</span>
          )}
          <span>
            A profile on Missa.{" "}
            <Link href="/profile/portfolio">Make yours</Link>
          </span>
        </footer>
      )}
      {player.current && mode !== "embedded" && <MiniPlayer player={player} />}
      <WorkDialog {...viewer.dialogProps} player={player} creator={name} />
    </div>
  );
}

function Avatar({
  photo,
  name,
  size = "md",
}: {
  photo: string;
  name: string;
  size?: "md" | "lg";
}) {
  return photo ? (
    <img
      src={photo}
      alt={`Portrait of ${name}`}
      className={cn(styles.avatar, size === "lg" && styles.avatarLarge)}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        styles.avatar,
        styles.monogram,
        size === "lg" && styles.avatarLarge,
        "font-heading",
      )}
    >
      {initials(name)}
    </span>
  );
}

function IdentityHeader({
  portfolio,
  name,
  address,
  level,
  featured,
  date,
  contactHref,
  hasRecord,
  sample,
  mode,
  onOpen,
  player,
}: {
  portfolio: PortfolioData;
  name: string;
  address: string;
  level: number;
  featured?: PortfolioWork;
  date: string;
  contactHref?: string;
  hasRecord: boolean;
  sample: boolean;
  mode: ProfileMode;
  onOpen: (work: PortfolioWork) => void;
  player: Player;
}) {
  const hero =
    portfolio.hero === "plate" && !featured?.image ? "type" : portfolio.hero;
  const practices = practiceLine(portfolio.selected);
  const showNow =
    portfolio.now.text.trim() &&
    (!portfolio.now.until || portfolio.now.until >= date);
  const [shared, setShared] = useState("");
  const share = async () => {
    const url =
      typeof window === "undefined" ? "" : window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared("Profile link copied.");
      }
    } catch {
      setShared("");
    }
  };
  const identity = (
    <div className={styles.identity}>
      {hero !== "plate" && (
        <div className={styles.identityMeta}>
          {hero === "portrait" && (
            <Avatar photo={portfolio.photo} name={name} />
          )}
          <span className={styles.metaStack}>
            {address && <span className="font-mono">@{address}</span>}
            {portfolio.location && (
              <span className={styles.location}>
                <MapPin aria-hidden="true" />
                {portfolio.location}
              </span>
            )}
          </span>
        </div>
      )}
      <div>
        <Heading
          level={level}
          className={cn(
            styles.name,
            hero === "type" && styles.nameType,
            "font-heading",
          )}
        >
          {name}
        </Heading>
        {practices && <p className={styles.practices}>{practices}</p>}
      </div>
      {portfolio.statement && (
        <p className={cn(styles.statement, "font-heading")}>
          {portfolio.statement}
        </p>
      )}
      {showNow && (
        <p className={styles.now}>
          <span aria-hidden="true" className={styles.nowDot} />
          <span>
            <strong>Now</strong> · {portfolio.now.text}
          </span>
        </p>
      )}
      {portfolio.openTo.length > 0 && (
        <div className={styles.openTo}>
          <span className={cn(styles.eyebrow, "font-mono")}>Open to</span>
          <ul aria-label="Open to">
            {portfolio.openTo.map((item) => (
              <li key={item.id ?? item.label}>
                <AvailabilityChip
                  item={item}
                  today={date}
                  className={styles.chip}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.actions}>
        {mode !== "embedded" && (
          <ProfileConnect
            handle={address || undefined}
            name={name}
            inquiries={portfolio.inquiries}
            contactHref={sample ? undefined : contactHref}
            live={mode === "page" && !sample}
            sample={sample}
          />
        )}
        {hasRecord && address && !sample && (
          <a
            href={`/@${address}/cv`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download aria-hidden="true" />
            CV
          </a>
        )}
        {mode === "page" && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Share profile"
            onClick={share}
          >
            <Share aria-hidden="true" />
          </Button>
        )}
        {mode === "page" && (
          <span role="status" className={styles.status}>
            {shared}
          </span>
        )}
      </div>
    </div>
  );

  if (hero === "plate" && featured?.image)
    return (
      <header className={styles.plateHero}>
        <img src={featured.image} alt="" className={styles.plateImage} />
        <div className={styles.plateScrim} aria-hidden="true" />
        <div className={styles.plateContent}>
          <div className={styles.identityMeta}>
            <Avatar photo={portfolio.photo} name={name} />
            <span className={styles.metaStack}>
              {address && <span className="font-mono">@{address}</span>}
              {portfolio.location && <span>{portfolio.location}</span>}
            </span>
          </div>
          {identity}
          <button
            type="button"
            className={styles.plateCredit}
            onClick={() => onOpen(featured)}
          >
            {featured.title}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </header>
    );

  return (
    <header
      className={cn(
        styles.hero,
        (hero === "type" || !featured) && styles.heroSingle,
      )}
    >
      {identity}
      {hero === "portrait" && featured && (
        <FeaturedFigure work={featured} onOpen={onOpen} player={player} />
      )}
    </header>
  );
}

function FeaturedFigure({
  work,
  onOpen,
  player,
}: {
  work: PortfolioWork;
  onOpen: (work: PortfolioWork) => void;
  player: Player;
}) {
  const excerpt = firstLines(work.text, 3, 180);
  const formats = workFormats(work);
  return (
    <figure className={styles.featured}>
      {work.image ? (
        <div className={styles.featuredMedia}>
          <img src={work.image} alt={work.caption || ""} />
          <span className={styles.featuredChip}>Featured work</span>
          {excerpt && (
            <div className={styles.featuredExcerpt}>
              <p className="font-heading">{excerpt}</p>
              <button type="button" onClick={() => onOpen(work)}>
                Read the work <ArrowRight aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className={styles.featuredText}
          onClick={() => onOpen(work)}
        >
          <span className={cn(styles.eyebrow, "font-mono")}>Featured work</span>
          <span className="font-heading">{excerpt || work.title}</span>
          <span className={styles.readLink}>
            Read the work <ArrowRight aria-hidden="true" />
          </span>
        </button>
      )}
      <figcaption className={styles.featuredCaption}>
        <button
          type="button"
          className="font-heading"
          onClick={() => onOpen(work)}
        >
          {work.title}
        </button>
        <span className="font-mono">
          {[formats.join(" · "), work.year].filter(Boolean).join(" — ")}
        </span>
        {work.audio && (
          <PlayButton
            track={work}
            player={player}
            className={styles.inlinePlay}
          />
        )}
      </figcaption>
    </figure>
  );
}

function UpcomingSection({
  id,
  events,
  creator,
  level,
}: {
  id?: string;
  events: PortfolioData["events"];
  creator: string;
  level: number;
}) {
  return (
    <section id={id} className={styles.section} aria-label="Upcoming">
      <SectionHead level={level} title="Upcoming" />
      <ul className={styles.events}>
        {events.map((event) => {
          const parts = eventDateParts(event);
          const href = safeHref(event.url);
          return (
            <li key={event.id ?? `${event.date}-${event.title}`}>
              <article className={styles.event}>
                <p className={styles.eventDate}>
                  <span className="font-mono">{parts.month}</span>
                  <span className="font-heading">{parts.day}</span>
                  <span className="font-mono">
                    {[parts.weekday, event.time].filter(Boolean).join(" ")}
                  </span>
                </p>
                <div className={styles.eventBody}>
                  {event.kind && (
                    <span className={styles.eventKind}>{event.kind}</span>
                  )}
                  <Heading
                    level={level + 1}
                    className={cn(styles.eventTitle, "font-heading")}
                  >
                    {event.title}
                  </Heading>
                  {event.place && (
                    <p className={styles.eventPlace}>
                      <MapPin aria-hidden="true" />
                      {event.place}
                    </p>
                  )}
                  <div className={styles.eventFoot}>
                    <span
                      className={cn(
                        styles.eventStatus,
                        event.status === "few" && styles.eventFew,
                      )}
                    >
                      {EVENT_STATUS_COPY[event.status]}
                    </span>
                    <span className={styles.eventLinks}>
                      <a
                        href={eventCalendarFile(event, creator)}
                        download={`${event.title.slice(0, 40) || "event"}.ics`}
                      >
                        <CalendarPlus aria-hidden="true" />
                        Add to calendar
                      </a>
                      {href && (
                        <a href={href} target="_blank" rel="noreferrer">
                          {event.status === "soldout" ? "Details" : "Book"}
                          <ArrowUpRight aria-hidden="true" />
                        </a>
                      )}
                    </span>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ShelfSection({
  id,
  portfolio,
  level,
}: {
  id?: string;
  portfolio: PortfolioData;
  level: number;
}) {
  const kindLabel = {
    book: "Book",
    chapbook: "Chapbook",
    record: "Record",
    catalogue: "Catalog",
    other: "Edition",
  } as const;
  return (
    <section id={id} className={styles.section} aria-label="Shelf">
      <SectionHead level={level} title="Shelf" />
      <div className={styles.shelf}>
        <ul>
          {portfolio.shelf.map((item) => {
            const href = safeHref(item.url);
            return (
              <li key={item.id ?? item.title} className={styles.shelfItem}>
                {item.cover ? (
                  <img
                    src={item.cover}
                    alt={`Cover of ${item.title}`}
                    className={cn(
                      styles.cover,
                      item.kind === "record" && styles.coverSquare,
                    )}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      styles.cover,
                      styles.coverType,
                      item.kind === "record" && styles.coverSquare,
                    )}
                  >
                    <span className="font-mono">
                      {kindLabel[item.kind].toUpperCase()}
                    </span>
                    <span className="font-heading">{item.title}</span>
                  </span>
                )}
                <div className={styles.shelfText}>
                  <span className="font-mono">
                    {[kindLabel[item.kind], item.publisher, item.year]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <Heading
                    level={level + 1}
                    className={cn(styles.shelfTitle, "font-heading")}
                  >
                    {item.title}
                  </Heading>
                  {item.note && <p>{item.note}</p>}
                  {href && (
                    <a href={href} target="_blank" rel="noreferrer">
                      Find it on {hostname(item.url)}
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <span aria-hidden="true" className={styles.ledge} />
      </div>
    </section>
  );
}

function RecordSection({
  id,
  portfolio,
  name,
  address,
  level,
  mode,
}: {
  id?: string;
  portfolio: PortfolioData;
  name: string;
  address: string;
  level: number;
  mode: ProfileMode;
}) {
  const creator = firstName(name);
  const entries = [...portfolio.record].sort((a, b) =>
    b.year.localeCompare(a.year),
  );
  const kindLabel: Record<PortfolioData["record"][number]["kind"], string> = {
    publication: "Publication",
    prize: "Prize",
    residency: "Residency",
    grant: "Grant",
    exhibition: "Exhibition",
    performance: "Performance",
    screening: "Screening",
    other: "Credit",
  };
  return (
    <section
      id={id}
      className={cn(styles.section, styles.record)}
      aria-label="Track record"
    >
      <div className={styles.recordIntro}>
        <SectionHead
          level={level}
          title="Track record"
          count={entries.length}
        />
        <p>
          Publications, prizes, residencies and shows. Each entry shows where it
          comes from.
        </p>
        {address && mode === "page" && (
          <a
            href={`/@${address}/cv`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download aria-hidden="true" />
            Download CV
          </a>
        )}
      </div>
      <ol className={styles.recordList}>
        {entries.map((entry) => (
          <li key={entry.id ?? `${entry.year}-${entry.title}`}>
            <span className={cn(styles.recordYear, "font-mono")}>
              {entry.year}
            </span>
            <span
              aria-hidden="true"
              className={cn(styles.orgMark, "font-heading")}
            >
              {initials(
                entry.organization?.name || entry.venue || entry.title,
              ).slice(0, 1)}
            </span>
            <span className={styles.recordText}>
              <span className={styles.recordTitle}>{entry.title}</span>
              <span className={styles.recordVenue}>
                {entry.organization?.href ? (
                  <a href={entry.organization.href}>
                    {entry.organization.name || entry.venue}
                  </a>
                ) : (
                  entry.venue
                )}
                {entry.venue || entry.organization ? " · " : ""}
                {kindLabel[entry.kind]}
              </span>
            </span>
            <ProvenanceBadge
              className={styles.chip}
              provenance={entry.provenance}
              creator={creator}
              organization={entry.organization?.name || entry.venue}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function PressSection({
  id,
  portfolio,
  level,
}: {
  id?: string;
  portfolio: PortfolioData;
  level: number;
}) {
  return (
    <section id={id} className={styles.section} aria-label="Press">
      <Heading level={level} className="sr-only">
        Press
      </Heading>
      <div className={styles.press}>
        {portfolio.press.map((item, index) => {
          const href = safeHref(item.url);
          return (
            <figure
              key={item.id ?? item.quote}
              className={cn(styles.quote, index === 0 && styles.quoteLead)}
            >
              <blockquote className="font-heading">“{item.quote}”</blockquote>
              <figcaption className="font-mono">
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {item.source}
                  </a>
                ) : (
                  item.source
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

function AboutSection({
  id,
  portfolio,
  name,
  first,
  contactHref,
  level,
  sample,
}: {
  id?: string;
  portfolio: PortfolioData;
  name: string;
  first: string;
  contactHref?: string;
  level: number;
  sample: boolean;
}) {
  const links = [
    {
      href: safeHref(portfolio.contact.website),
      label: portfolio.contact.website && hostname(portfolio.contact.website),
      icon: Globe,
    },
    {
      href: safeHref(portfolio.contact.instagram),
      label: "Instagram",
      icon: ArrowUpRight,
    },
    {
      href: safeHref(portfolio.contact.newsletter),
      label: "Newsletter",
      icon: Mail,
    },
  ].filter((link) => link.href);
  return (
    <section
      id={id}
      className={cn(styles.section, styles.about)}
      aria-label={`About ${name}`}
    >
      <div className={styles.aboutText}>
        <Heading
          level={level}
          className={cn(styles.sectionTitle, "font-heading")}
        >
          About
        </Heading>
        {portfolio.bio && <p className="font-heading">{portfolio.bio}</p>}
      </div>
      <div className={styles.contactCard}>
        <Heading
          level={level + 1}
          className={cn(styles.contactTitle, "font-heading")}
        >
          Contact
        </Heading>
        {contactHref && !sample ? (
          <>
            <p>{first} shares this address for enquiries.</p>
            <a href={contactHref} className={buttonVariants()}>
              <Mail aria-hidden="true" />
              Email {first}
            </a>
          </>
        ) : (
          <p>
            {sample
              ? "Contact actions are turned off in this sample."
              : `${first} prefers to be reached through these links.`}
          </p>
        )}
        {links.length > 0 && (
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  <link.icon aria-hidden="true" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
