"use client";
/* eslint-disable @next/next/no-img-element -- Previews are PNGs drawn by our own routes; next/image can't optimise them. */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Download,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  orderedModules,
  publicPortfolioProjection,
  type PortfolioData,
} from "@/lib/creator-portfolio-schema";
import { featuredWork } from "@/lib/creator-profile";
import {
  signatureFields,
  signatureHtml,
  signatureText,
} from "@/emails/creator-signature";
import {
  eventWhen,
  profileLink,
  scanLine,
  shareableEvents,
} from "@/lib/creator-share-kit";
import { copyRich, copyText } from "../share/clipboard";
import { EventCard } from "../share/event-card";
import { EditorHead } from "./studio-editors";
import styles from "./share-panel.module.css";

/** Where each piece of the kit lives. Design reviews point these at sample routes. */
export type ShareKitLinks = {
  linkCard: string;
  story: string;
  event: (eventId: string) => string;
};

const liveLinks = (handle: string): ShareKitLinks => ({
  linkCard: `/@${handle}/share.png`,
  story: `/@${handle}/story.png`,
  event: (eventId) => `/@${handle}/events/${eventId}`,
});

/** Adds a query value to an address that may already have a query. */
function withQuery(address: string, key: string, value: string | number) {
  return `${address}${address.includes("?") ? "&" : "?"}${key}=${value}`;
}

const noopSubscribe = () => () => {};

/** False while the page is drawn on the server and during hydration. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type Copied =
  | { kind: "idle" }
  | { kind: "done"; message: string }
  | { kind: "failed"; message: string; source?: string };

/** A status line that clears itself, for the live region under a copy button. */
function useCopyStatus() {
  const [status, setStatus] = useState<Copied>({ kind: "idle" });
  useEffect(() => {
    if (status.kind !== "done") return;
    const timer = window.setTimeout(() => setStatus({ kind: "idle" }), 6000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return [status, setStatus] as const;
}

function CopyStatus({ status }: { status: Copied }) {
  return (
    <p
      role="status"
      className={cn(
        styles.status,
        status.kind === "failed" && styles.statusFailed,
      )}
    >
      {status.kind === "done" && (
        <>
          <Check aria-hidden="true" />
          {status.message}
        </>
      )}
      {status.kind === "failed" && (
        <>
          <AlertCircle aria-hidden="true" />
          {status.message}
        </>
      )}
    </p>
  );
}

/** One generated image, with the three states a picture can be in. */
function PreviewImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const address = attempt ? withQuery(src, "r", attempt) : src;
  return (
    <div
      className={cn(styles.frame, className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {state !== "failed" && (
        <img
          key={address}
          src={address}
          alt={alt}
          width={width}
          height={height}
          className={styles.image}
          data-ready={state === "ready" ? "" : undefined}
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
        />
      )}
      {state === "loading" && (
        <Skeleton
          className={styles.skeleton}
          aria-hidden="true"
          data-testid="preview-loading"
        />
      )}
      {state === "failed" && (
        <div className={styles.failed} role="alert">
          <AlertCircle aria-hidden="true" />
          <p>This preview didn’t load. Your profile is fine.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setState("loading");
              setAttempt((count) => count + 1);
            }}
          >
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h3 id={id} className="font-heading">
          {title}
        </h3>
        <p>{lead}</p>
      </div>
      {children}
    </section>
  );
}

function Caption({ name, size }: { name: string; size: string }) {
  return (
    <figcaption className={styles.caption}>
      <strong>{name}</strong>
      <span className="font-mono">{size}</span>
    </figcaption>
  );
}

/** Holds the place of the kit on the server and while the page hydrates. */
function KitLoading() {
  return (
    <div className={styles.section} aria-busy="true">
      <Skeleton className={styles.loadingTitle} />
      <Skeleton className={styles.loadingFrame} />
      <Skeleton className={styles.loadingTitle} />
    </div>
  );
}

/** What visitors get once there is a published profile to draw from. */
function Kit({
  draft,
  handle,
  changedSincePublish,
  onPublish,
  links,
}: {
  draft: PortfolioData;
  handle: string;
  changedSincePublish: boolean;
  onPublish: () => void;
  links: ShareKitLinks;
}) {
  // A fresh address each time the kit opens, so a republished profile isn't
  // hidden behind a cached picture.
  const [version] = useState(() => Date.now());
  const name = draft.name.trim() || `@${handle}`;
  const portfolio = useMemo(() => publicPortfolioProjection(draft), [draft]);
  const events = useMemo(() => shareableEvents(draft), [draft]);
  const upcomingHidden = useMemo(
    () =>
      draft.events.length > 0 &&
      orderedModules(draft.modules).find((entry) => entry.id === "upcoming")
        ?.visible === false,
    [draft.events.length, draft.modules],
  );
  const hasImage = Boolean(featuredWork(portfolio.works)?.image);
  const fields = useMemo(() => signatureFields(draft, handle), [draft, handle]);
  const html = useMemo(() => signatureHtml(fields), [fields]);
  const preview = useMemo(
    () => signatureHtml(fields, { preview: true }),
    [fields],
  );
  const text = useMemo(() => signatureText(fields), [fields]);
  const link = profileLink(handle);
  const [signatureStatus, setSignatureStatus] = useCopyStatus();
  const [linkStatus, setLinkStatus] = useCopyStatus();
  const manual = useRef<HTMLTextAreaElement>(null);

  const copySignatureHtml = async () => {
    if (await copyRich(html, text))
      setSignatureStatus({
        kind: "done",
        message:
          "Signature copied. Paste it into your mail app’s signature box.",
      });
    else
      setSignatureStatus({
        kind: "failed",
        message:
          "Couldn’t copy from this browser. Select the HTML below and copy it yourself.",
        source: html,
      });
  };
  const copySignatureText = async () => {
    if (await copyText(text))
      setSignatureStatus({
        kind: "done",
        message: "Plain text copied.",
      });
    else
      setSignatureStatus({
        kind: "failed",
        message:
          "Couldn’t copy from this browser. Select the text below and copy it yourself.",
        source: text,
      });
  };
  const copyLink = async () => {
    setLinkStatus(
      (await copyText(link))
        ? { kind: "done", message: "Profile link copied." }
        : {
            kind: "failed",
            message:
              "Couldn’t copy from this browser. Select the link and copy it yourself.",
          },
    );
  };

  const manualSource =
    signatureStatus.kind === "failed" ? signatureStatus.source : undefined;
  // When copying fails, hand the keyboard to the text so Ctrl+C or ⌘C works.
  useEffect(() => {
    if (manualSource) manual.current?.focus();
  }, [manualSource]);

  const first = events[0];
  return (
    <>
      {changedSincePublish && (
        <Alert role="status" className={styles.changes}>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Showing your last published version</AlertTitle>
          <AlertDescription>
            You’ve changed your profile since you last published. The images and
            cards below still show what visitors see.
            <span className={styles.changesAction}>
              <Button variant="outline" onClick={onPublish}>
                Publish changes
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Section
        title="Link card"
        lead="Shown when someone shares your profile link in a message or a post."
      >
        <figure className={styles.figure}>
          <PreviewImage
            src={withQuery(links.linkCard, "v", version)}
            alt={`Link card for ${name}`}
            width={1200}
            height={630}
            className={styles.linkFrame}
          />
          <Caption name="Link card" size="1200 × 630" />
        </figure>
        <div className={styles.actions}>
          <a
            href={withQuery(links.linkCard, "v", version)}
            download={`${handle}-link-card.png`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download aria-hidden="true" />
            Download link card
          </a>
        </div>
        {!hasImage && (
          <p className={styles.hint}>
            Your featured work has no image, so the card is set in type.
          </p>
        )}
      </Section>

      <Section
        title="Story image"
        lead="Your featured work with its first lines, sized for stories."
      >
        <figure className={cn(styles.figure, styles.storyFigure)}>
          <PreviewImage
            src={withQuery(links.story, "v", version)}
            alt={`Story image for ${name}`}
            width={1080}
            height={1920}
            className={styles.storyFrame}
          />
          <Caption name="Story" size="1080 × 1920" />
        </figure>
        <div className={styles.actions}>
          <a
            href={withQuery(links.story, "v", version)}
            download={`${handle}-story.png`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download aria-hidden="true" />
            Download story
          </a>
        </div>
        {!hasImage && (
          <p className={styles.hint}>
            Your featured work has no image, so the story is set in type.
          </p>
        )}
      </Section>

      <Section
        title="Event cards"
        lead="A printable A6 card for each upcoming event, with a QR code to your profile."
      >
        {first ? (
          <>
            <figure className={cn(styles.figure, styles.eventFigure)}>
              <div className={styles.eventPreview} aria-hidden="true">
                <EventCard
                  name={name}
                  handleKey={handle}
                  event={first}
                  scan={scanLine(portfolio)}
                  headingAs="p"
                />
              </div>
              <Caption name="Event card" size="A6 · 105 × 148 mm" />
            </figure>
            <ul className={styles.events} aria-label="Upcoming events">
              {events.map((event) => (
                <li key={event.id}>
                  <div className={styles.eventText}>
                    <span className={styles.eventTitle}>{event.title}</span>
                    <span className={cn(styles.eventMeta, "font-mono")}>
                      {eventWhen(event)}
                    </span>
                  </div>
                  <a
                    href={links.event(event.id)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open card for ${event.title} (opens in a new tab)`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Open card
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            {changedSincePublish && (
              <p className={styles.hint}>
                An event you’ve added since publishing has no card until you
                publish your changes.
              </p>
            )}
          </>
        ) : (
          <Empty variant="bordered" className={styles.empty}>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No upcoming events</EmptyTitle>
              <EmptyDescription>
                {upcomingHidden
                  ? "Your Upcoming section is switched off, so there are no event cards. Switch it on to bring them back."
                  : "Add an event with a title and a date still to come under Upcoming. Its card appears here."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Section>

      <Section
        title="Email signature"
        lead="Your name, what you make and your profile link. Paste it into your mail app’s signature settings."
      >
        <div className={styles.signature}>
          <span className={styles.signatureLabel}>Preview</span>
          <div
            className={styles.signaturePreview}
            // The builder escapes every field; see emails/creator-signature.ts.
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={copySignatureHtml}>
            <Copy aria-hidden="true" />
            Copy as HTML
          </Button>
          <Button variant="outline" onClick={copySignatureText}>
            <Copy aria-hidden="true" />
            Copy as plain text
          </Button>
        </div>
        <CopyStatus status={signatureStatus} />
        {manualSource && (
          <div className="font-mono">
            <Textarea
              ref={manual}
              readOnly
              rows={5}
              value={manualSource}
              aria-label="Signature to copy by hand"
              className={styles.manual}
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}
      </Section>

      <Section
        title="Profile link"
        lead="The address people type or tap to reach your profile."
      >
        <div className={styles.copyRow}>
          <div className={cn(styles.linkField, "font-mono")}>
            <Input
              readOnly
              value={link}
              aria-label="Profile link"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <Button variant="outline" onClick={copyLink}>
            <Copy aria-hidden="true" />
            Copy link
          </Button>
        </div>
        <CopyStatus status={linkStatus} />
      </Section>
    </>
  );
}

/** Before the first publish there is nothing to draw from. */
function Locked({
  isAccount,
  onPublish,
}: {
  isAccount: boolean;
  onPublish: () => void;
}) {
  return (
    <Empty variant="bordered" className={styles.locked}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Share2 aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Your share kit appears when you publish</EmptyTitle>
        <EmptyDescription>
          It’s made from your published profile, so there’s nothing to share
          until the profile is live. Here’s what you’ll get.
        </EmptyDescription>
      </EmptyHeader>
      <ul className={styles.get}>
        <li>
          <strong>Link card</strong>
          <span>The picture that shows when your profile link is shared.</span>
        </li>
        <li>
          <strong>Story image</strong>
          <span>Your featured work, sized 1080 × 1920 for stories.</span>
        </li>
        <li>
          <strong>Event cards</strong>
          <span>
            A printable A6 card with a QR code for each upcoming event.
          </span>
        </li>
        <li>
          <strong>Email signature</strong>
          <span>Your name, what you make and your profile link.</span>
        </li>
      </ul>
      <EmptyContent>
        {isAccount ? (
          <Button onClick={onPublish}>Publish profile</Button>
        ) : (
          <>
            <Button variant="outline" disabled>
              Publishing needs an account
            </Button>
            <p className={styles.hint}>
              Sign in to claim your address, then come back here.
            </p>
          </>
        )}
      </EmptyContent>
    </Empty>
  );
}

/**
 * The share kit: a link card, a story image, event cards and an email
 * signature, all made from the published profile. Before the first publish it
 * explains what is coming and offers to publish; after changes it says the kit
 * still shows the last published version.
 */
export function SharePanel({
  draft,
  handle,
  published,
  changedSincePublish,
  isAccount,
  onPublish,
  links,
}: {
  draft: PortfolioData;
  /** The claimed handle without the @, empty until the first publish. */
  handle: string;
  published: boolean;
  changedSincePublish: boolean;
  isAccount: boolean;
  onPublish: () => void;
  /** Design reviews point the kit at sample routes. */
  links?: Partial<ShareKitLinks>;
}) {
  const live = published && Boolean(handle);
  // The kit builds picture addresses that change per visit, so it is drawn on
  // the client only.
  const mounted = useMounted();
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <EditorHead
          title="Share kit"
          lead="A link card, a story image, event cards and an email signature, made from your published profile."
        />
      </div>
      {live && !mounted ? (
        <KitLoading />
      ) : live ? (
        <Kit
          // A new key redraws the pictures after a publish.
          key={`${handle}:${changedSincePublish}`}
          draft={draft}
          handle={handle}
          changedSincePublish={changedSincePublish}
          onPublish={onPublish}
          links={{ ...liveLinks(handle), ...links }}
        />
      ) : (
        <Locked isAccount={isAccount} onPublish={onPublish} />
      )}
    </div>
  );
}
