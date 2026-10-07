"use client";
/* eslint-disable @next/next/no-img-element -- Owned portfolio media is served through an authorization-gated route. */
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  Download,
  Globe,
  Mail,
  MapPin,
  Pause,
  Play,
  Share,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AvailabilityChip } from "@/components/missa/availability-chip";
import { ProvenanceBadge } from "@/components/missa/provenance-badge";
import { ProfileConnect } from "./profile-connect";
import { cn } from "@/lib/utils";
import {
  orderedModules,
  type PortfolioData,
  type PortfolioModule,
  type PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import {
  EVENT_STATUS_COPY,
  MODULE_LABELS,
  eventCalendarFile,
  eventDateParts,
  featuredWork,
  firstLines,
  initials,
  readingMinutes,
  upcomingEvents,
  workFormats,
  type WorkFormat,
} from "@/lib/creator-profile";
import "@/components/design-system/creator-palette.css";
import styles from "./public-profile.module.css";

export type ProfileMode = "page" | "preview" | "embedded";

function Heading({
  level,
  ...props
}: { level: number } & HTMLAttributes<HTMLHeadingElement>) {
  const Tag = `h${Math.min(6, Math.max(1, level))}` as "h2";
  return <Tag {...props} />;
}

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

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function useAudioPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PortfolioWork | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = new Audio();
    element.preload = "none";
    const update = () =>
      setProgress(
        element.duration ? (element.currentTime / element.duration) * 100 : 0,
      );
    element.addEventListener("timeupdate", update);
    element.addEventListener("play", () => setPlaying(true));
    element.addEventListener("pause", () => setPlaying(false));
    element.addEventListener("ended", () => setPlaying(false));
    element.addEventListener("error", () => {
      setFailed(true);
      setPlaying(false);
    });
    audio.current = element;
    return () => {
      element.pause();
      audio.current = null;
    };
  }, []);
  const toggle = (work: PortfolioWork) => {
    const element = audio.current;
    if (!element || !work.audio) return;
    if (current?.id === work.id && current?.audio === work.audio) {
      if (element.paused) void element.play().catch(() => setFailed(true));
      else element.pause();
      return;
    }
    setFailed(false);
    setProgress(0);
    setCurrent(work);
    element.src = work.audio;
    void element.play().catch(() => setFailed(true));
  };
  const isPlaying = (work: PortfolioWork) =>
    playing && current?.id === work.id && current?.audio === work.audio;
  return { current, playing, progress, failed, toggle, isPlaying };
}

type Player = ReturnType<typeof useAudioPlayer>;

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
  const [viewing, setViewing] = useState<PortfolioWork | null>(null);
  const address = handle || portfolio.handle;
  const contactHref = portfolio.contact.email
    ? `mailto:${portfolio.contact.email}`
    : undefined;
  const filled: Record<PortfolioModule, boolean> = {
    work: gridWorks.length > 0,
    upcoming: events.length > 0,
    shelf: portfolio.shelf.length > 0,
    record: portfolio.record.length > 0,
    press: portfolio.press.length > 0,
    about: Boolean(
      portfolio.bio.trim() ||
      contactHref ||
      portfolio.contact.website ||
      portfolio.contact.instagram ||
      portfolio.contact.newsletter,
    ),
  };
  // Embedded marketing samples show identity and work only.
  const modules = orderedModules(portfolio.modules).filter(
    (module) =>
      module.visible &&
      filled[module.id] &&
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
          onOpen={setViewing}
          player={player}
        />
        {mode === "page" && modules.length > 1 && (
          <nav aria-label="Profile sections" className={styles.sectionNav}>
            {modules.map((module) => (
              <a key={module.id} href={`#profile-${module.id}`}>
                {MODULE_LABELS[module.id]}
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
                  onOpen={setViewing}
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
      <WorkDialog
        work={viewing}
        onClose={() => setViewing(null)}
        player={player}
        creator={name}
      />
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
          <Button
            type="button"
            variant="link"
            className={styles.plateCredit}
            onClick={() => onOpen(featured)}
          >
            {featured.title}
            <ArrowRight aria-hidden="true" />
          </Button>
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
              <Button type="button" variant="link" onClick={() => onOpen(work)}>
                Read the work <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className={cn(styles.surface, styles.featuredText)}
          onClick={() => onOpen(work)}
        >
          <span className={cn(styles.eyebrow, "font-mono")}>Featured work</span>
          <span className="font-heading">{excerpt || work.title}</span>
          <span className={styles.readLink}>
            Read the work <ArrowRight aria-hidden="true" />
          </span>
        </Button>
      )}
      <figcaption className={styles.featuredCaption}>
        <Button
          type="button"
          variant="ghost"
          className={styles.surface}
          onClick={() => onOpen(work)}
        >
          <span className="font-heading">{work.title}</span>
        </Button>
        <span className="font-mono">
          {[formats.join(" · "), work.year].filter(Boolean).join(" — ")}
        </span>
        {work.audio && (
          <PlayButton
            work={work}
            player={player}
            className={styles.inlinePlay}
          />
        )}
      </figcaption>
    </figure>
  );
}

function PlayButton({
  work,
  player,
  className,
}: {
  work: PortfolioWork;
  player: Player;
  className?: string;
}) {
  const playing = player.isPlaying(work);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(styles.play, className)}
      onClick={() => player.toggle(work)}
      aria-label={`${playing ? "Pause" : "Play"} ${work.title}`}
    >
      {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
    </Button>
  );
}

function SectionHead({
  level,
  title,
  count,
  children,
}: {
  level: number;
  title: string;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <Heading
        level={level}
        className={cn(styles.sectionTitle, "font-heading")}
      >
        {title}
        {count !== undefined && (
          <span className={cn(styles.count, "font-mono")}>
            {String(count).padStart(2, "0")}
          </span>
        )}
      </Heading>
      {children}
    </div>
  );
}

function WorkSection({
  id,
  works,
  total,
  lens,
  level,
  onOpen,
  player,
}: {
  id?: string;
  works: PortfolioWork[];
  total: number;
  lens: PortfolioData["lens"];
  level: number;
  onOpen: (work: PortfolioWork) => void;
  player: Player;
}) {
  const [filter, setFilter] = useState<WorkFormat | "All">("All");
  const formats = useMemo(
    () => [...new Set(works.flatMap(workFormats))],
    [works],
  );
  const shown =
    filter === "All"
      ? works
      : works.filter((work) => workFormats(work).includes(filter));
  return (
    <section id={id} className={styles.section} aria-label="Selected work">
      <SectionHead level={level} title="Selected work" count={total}>
        {formats.length > 1 && (
          <div
            role="group"
            aria-label="Filter work by format"
            className={styles.filter}
          >
            {(["All", ...formats] as const).map((format) => (
              <Button
                key={format}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={filter === format}
                onClick={() => setFilter(format)}
              >
                {format === "All" ? "All work" : format}
              </Button>
            ))}
          </div>
        )}
      </SectionHead>
      <p className="sr-only" aria-live="polite">
        {filter === "All"
          ? ""
          : `Showing ${shown.length} ${filter.toLowerCase()} ${shown.length === 1 ? "work" : "works"}.`}
      </p>
      <ol className={styles.works} data-lens={lens}>
        {shown.map((work, index) => (
          <li key={work.id ?? `${work.title}-${index}`}>
            <WorkCard
              work={work}
              index={works.indexOf(work)}
              level={level + 1}
              onOpen={onOpen}
              player={player}
              lens={lens}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function WorkCard({
  work,
  index,
  level,
  onOpen,
  player,
  lens,
}: {
  work: PortfolioWork;
  index: number;
  level: number;
  onOpen: (work: PortfolioWork) => void;
  player: Player;
  lens: PortfolioData["lens"];
}) {
  const formats = workFormats(work);
  const excerpt = firstLines(work.text, 4, 220);
  const href = safeHref(work.url);
  const linkOnly = !work.image && !work.text.trim() && !work.audio && href;
  return (
    <article className={styles.card}>
      {work.image ? (
        <Button
          type="button"
          variant="ghost"
          className={cn(styles.surface, styles.cardMedia)}
          onClick={() => onOpen(work)}
          aria-label={`Open ${work.title}`}
        >
          <img src={work.image} alt={work.caption || ""} loading="lazy" />
        </Button>
      ) : work.text.trim() ? (
        <Button
          type="button"
          variant="ghost"
          className={cn(styles.surface, styles.cardText)}
          onClick={() => onOpen(work)}
          aria-label={`Read ${work.title}`}
        >
          <span className={cn(styles.cardTextMeta, "font-mono")}>
            {[work.kind, `${readingMinutes(work.text)} min read`]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className={cn(styles.cardExcerpt, "font-heading")}>
            {excerpt}
          </span>
        </Button>
      ) : work.audio ? (
        <div className={styles.cardSound}>
          <PlayButton work={work} player={player} />
          <span className="font-mono">{work.kind || "Recording"}</span>
        </div>
      ) : linkOnly ? (
        <a
          className={styles.cardLink}
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          <span className="font-mono">
            <Globe aria-hidden="true" /> {hostname(work.url)}
          </span>
          <span className="font-heading">{work.title}</span>
          <span className={styles.readLink}>
            Open <ArrowUpRight aria-hidden="true" />
          </span>
        </a>
      ) : null}
      {work.audio && (work.image || work.text.trim()) && (
        <PlayButton work={work} player={player} className={styles.cardPlay} />
      )}
      <div className={cn(styles.cardMeta, "font-mono")}>
        <span>
          {String(index + 1).padStart(2, "0")} —{" "}
          {work.kind || formats.join(" · ") || "Work"}
        </span>
        <span>{work.year}</span>
      </div>
      <Heading level={level} className={cn(styles.cardTitle, "font-heading")}>
        <Button
          type="button"
          variant="ghost"
          className={styles.surface}
          onClick={() => onOpen(work)}
        >
          {work.title}
        </Button>
      </Heading>
      {lens === "visual" && work.caption && (
        <p className={styles.cardCaption}>{work.caption}</p>
      )}
      {work.summary && <p className={styles.cardSummary}>{work.summary}</p>}
      {href && !linkOnly && (
        <a
          className={styles.cardOut}
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          {hostname(work.url)}
          <ArrowUpRight aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}

function WorkDialog({
  work,
  onClose,
  player,
  creator,
}: {
  work: PortfolioWork | null;
  onClose: () => void;
  player: Player;
  creator: string;
}) {
  const href = work ? safeHref(work.url) : undefined;
  return (
    <Dialog open={Boolean(work)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.dialog}>
        {work && (
          <>
            <div className={styles.dialogHead}>
              <span className="font-mono">
                {[work.kind, work.year].filter(Boolean).join(" · ")}
              </span>
              <DialogTitle className={cn(styles.dialogTitle, "font-heading")}>
                {work.title}
              </DialogTitle>
              <DialogDescription>
                {work.summary || `By ${creator}`}
              </DialogDescription>
            </div>
            {work.image && (
              <figure className={styles.dialogFigure}>
                <img src={work.image} alt={work.caption || ""} />
                {work.caption && <figcaption>{work.caption}</figcaption>}
              </figure>
            )}
            {work.audio && (
              <div className={styles.dialogAudio}>
                <PlayButton work={work} player={player} />
                <span>
                  {player.isPlaying(work) ? "Playing" : "Listen"} · {work.title}
                </span>
              </div>
            )}
            {work.text.trim() && (
              <div className={cn(styles.reading, "font-heading")}>
                {work.text}
              </div>
            )}
            {href && (
              <a
                className={buttonVariants({ variant: "outline" })}
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                Open on {hostname(work.url)}
                <ArrowUpRight aria-hidden="true" />
              </a>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MiniPlayer({ player }: { player: Player }) {
  const work = player.current!;
  return (
    <div className={styles.miniPlayer} role="region" aria-label="Now playing">
      {work.image && <img src={work.image} alt="" />}
      <div className={styles.miniText}>
        <span>{work.title}</span>
        {player.failed ? (
          <span className={styles.miniError}>
            Couldn’t play this recording. Try again.
          </span>
        ) : (
          <Progress
            className={styles.miniTrack}
            aria-label="Playback position"
            value={Math.round(player.progress)}
          />
        )}
      </div>
      <PlayButton work={work} player={player} />
    </div>
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
