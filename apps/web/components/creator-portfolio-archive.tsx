"use client";
/* eslint-disable @next/next/no-img-element -- Creator uploads and local sample media. */

import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Headphones,
  ImageOff,
  Mail,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";
import { InstitutionSocialLinks } from "./institution-social-links";
import { publicWebUrl } from "@/lib/creator-portfolio-draft";
import styles from "./creator-portfolio-archive.module.css";

type Entry = {
  title: string;
  text: string;
  image: string;
  audio: string;
  formats: string[];
  url?: string;
  summary?: string;
  alt?: string;
};
type Props = {
  name: string;
  bio: string;
  portrait: string;
  practices: string[];
  sample: boolean;
  works: Entry[];
  book: { title: string; cover: string; year: string; url: string };
  credit: { title: string; venue: string; year: string; url: string };
  contact: { email: string; website: string; instagram: string };
};

function PortfolioImage({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <div className={styles.media} data-state={state}>
      {state === "loading" && <Skeleton className={styles.imageSkeleton} />}
      {state !== "error" && (
        <img
          ref={(node) => {
            if (node?.complete) setState(node.naturalWidth ? "ready" : "error");
          }}
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
        />
      )}
      {state === "error" && (
        <span className={styles.mediaError}>
          <ImageOff aria-hidden="true" />
          Image unavailable<span>You can still explore this work.</span>
        </span>
      )}
    </div>
  );
}

export function CreatorPortfolioArchive({
  name,
  bio,
  portrait,
  practices,
  sample,
  works,
  book,
  credit,
  contact,
}: Props) {
  const [medium, setMedium] = useState("All");
  const [opened, setOpened] = useState<Entry | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const formats = [...new Set(works.flatMap((work) => work.formats))];
  const visible =
    medium === "All"
      ? works
      : works.filter((work) => work.formats.includes(medium));
  const cover = works.find((work) => work.image);
  const open = (entry: Entry) => {
    setAudioError(false);
    setOpened(entry);
  };
  const contactAvailable =
    sample || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email);
  return (
    <main id="main-content" className={styles.archive}>
      <div className={styles.masthead}>
        <span>
          {sample ? "Fictional creator · design study" : "Independent practice"}
        </span>
        <a href="#archive-about">
          About & contact <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
      <header className={styles.hero} data-has-cover={Boolean(cover)}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>
            {practices.join(" / ") || "Selected work"}
          </p>
          <h1 className="font-heading">{name}</h1>
          <div className={styles.heroBottom}>
            <p>{bio}</p>
            <a href="#archive-work" aria-label="Explore selected work">
              <ArrowDown aria-hidden="true" />
            </a>
          </div>
        </div>
        {cover && (
          <div className={styles.heroImage}>
            <PortfolioImage
              key={cover.image}
              src={cover.image}
              alt={cover.alt || cover.title}
              eager
            />
            <span className={styles.coverCaption}>From {cover.title}</span>
          </div>
        )}
      </header>
      <div className={styles.introduction}>
        <span className={styles.smallIdentity}>
          {portrait && <img src={portrait} alt="" />}
          <span>
            {sample ? "Vancouver ↔ Taipei" : name}
            <small>
              {sample
                ? "Working across places and disciplines."
                : "An independent creative practice."}
            </small>
          </span>
        </span>
        {contactAvailable && (
          <Button
            variant="outline"
            {...(sample
              ? { onClick: () => setContactOpen(true) }
              : {
                  nativeButton: false,
                  render: <a href={`mailto:${contact.email}`} />,
                })}
          >
            Let’s talk <ArrowUpRight aria-hidden="true" />
          </Button>
        )}
      </div>
      <section
        id="archive-work"
        className={styles.collection}
        aria-labelledby="collection-title"
      >
        <div className={styles.collectionHeading}>
          <div>
            <p className={styles.kicker}>A collection of things made</p>
            <h2 id="collection-title" className="font-heading">
              Selected work
              <span>({works.length.toString().padStart(2, "0")})</span>
            </h2>
          </div>
          {formats.length > 1 && (
            <div className={styles.filters} aria-label="Filter works by medium">
              {["All", ...formats].map((format) => (
                <Button
                  key={format}
                  variant="ghost"
                  aria-pressed={medium === format}
                  onClick={() => setMedium(format)}
                >
                  {format}
                </Button>
              ))}
            </div>
          )}
        </div>
        <p className="sr-only" role="status">
          {visible.length} {visible.length === 1 ? "work" : "works"} shown
          {medium !== "All" ? ` in ${medium}` : ""}
        </p>
        <div className={styles.grid} data-filtered={medium !== "All"}>
          {visible.map((entry, index) => (
            <article
              key={`${entry.title}-${index}`}
              className={styles.entry}
              data-featured={index === 0 && medium === "All"}
            >
              <Button
                variant="ghost"
                className={styles.entryButton}
                onClick={() => open(entry)}
                aria-label={`Explore ${entry.title}`}
              >
                <div className={styles.entryVisual}>
                  {entry.image ? (
                    <PortfolioImage
                      key={entry.image}
                      src={entry.image}
                      alt={entry.alt || entry.title}
                    />
                  ) : (
                    <div
                      className={styles.textArtwork}
                      data-audio={entry.formats.includes("Sound")}
                    >
                      {entry.formats.includes("Sound") ? (
                        <>
                          <Headphones aria-hidden="true" />
                          <span className="font-heading">
                            An invitation
                            <br />
                            to listen.
                          </span>
                          <small>
                            {entry.audio
                              ? "Audio & accompanying text"
                              : "Accompanying text · audio unavailable"}
                          </small>
                        </>
                      ) : (
                        <>
                          <span className={styles.kicker}>From the page</span>
                          <span className="font-heading">
                            {entry.text.slice(0, 150) || entry.title}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <span className={styles.openCue}>
                    <ArrowUpRight aria-hidden="true" />
                    <span>Explore work</span>
                  </span>
                </div>
                <div className={styles.entryCaption}>
                  <div>
                    <span className={styles.entryMedium}>
                      {entry.formats.join(" · ") || "Work"}
                    </span>
                    <h3 className="font-heading">{entry.title}</h3>
                  </div>
                  <span className={styles.entryNumber}>
                    {String(works.indexOf(entry) + 1).padStart(2, "0")}
                  </span>
                </div>
              </Button>
              {entry.summary && (
                <p className={styles.entrySummary}>{entry.summary}</p>
              )}
            </article>
          ))}
        </div>
        {!visible.length && (
          <div className={styles.empty}>
            <h3 className="font-heading">Room for what comes next.</h3>
            <p>
              {works.length
                ? "No works in this medium yet."
                : "New work will appear here when the artist is ready to share it."}
            </p>
            {works.length > 0 && (
              <Button variant="outline" onClick={() => setMedium("All")}>
                View all work
              </Button>
            )}
          </div>
        )}
      </section>
      {book.title && (
        <section className={styles.book} aria-labelledby="book-title">
          <div className={styles.bookImage}>
            {book.cover && (
              <PortfolioImage
                key={book.cover}
                src={book.cover}
                alt={`Cover of ${book.title}`}
              />
            )}
          </div>
          <div>
            <p className={styles.kicker}>
              In print{book.year && ` / ${book.year}`}
            </p>
            <h2 id="book-title" className="font-heading">
              {book.title}
            </h2>
            <p>{name}</p>
            <Button
              variant="outline"
              onClick={() =>
                open({
                  title: book.title,
                  image: book.cover,
                  text: sample
                    ? "A fictional sample book, collecting poems and photographs about the places between departure and arrival."
                    : "",
                  audio: "",
                  formats: ["Book"],
                  url: book.url,
                })
              }
            >
              Discover the book <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}
      {credit.title && (
        <section
          className={styles.publication}
          aria-label="Selected publication"
        >
          <span className={styles.kicker}>Published work</span>
          <div>
            <h2 className="font-heading">{credit.title}</h2>
            <p>
              {credit.venue}
              {credit.year && ` · ${credit.year}`}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              open({
                title: credit.title,
                image: "",
                audio: "",
                formats: ["Publication"],
                text: sample
                  ? "A fictional sample publication. The artist’s original publication opens here when a link is provided."
                  : "",
                url: credit.url,
                summary: credit.venue,
              })
            }
            aria-label={`Read ${credit.title}`}
          >
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </section>
      )}
      <footer id="archive-about" className={styles.about}>
        <div>
          <p className={styles.kicker}>Behind the work</p>
          <h2 className="font-heading">
            Always looking.
            <br />
            <em>Always listening.</em>
          </h2>
        </div>
        <div className={styles.aboutCopy}>
          <p>
            {sample
              ? "I work across text, field recordings and photography to trace the quiet geographies that hold us and the ones we leave behind. My practice begins with listening: to rooms, footpaths, weather and the language people leave in them."
              : bio}
          </p>
          <div className={styles.socials}>
            {sample ? (
              ["Website", "Instagram", "X", "Threads", "Facebook"].map(
                (label) => (
                  <Button
                    key={label}
                    variant="link"
                    onClick={() => setContactOpen(true)}
                  >
                    {label}
                    <ArrowUpRight aria-hidden="true" />
                  </Button>
                ),
              )
            ) : (
              <InstitutionSocialLinks
                name={name}
                links={{
                  website: contact.website,
                  instagram: contact.instagram,
                }}
              />
            )}
          </div>
          {contactAvailable && (
            <Button
              {...(sample
                ? { onClick: () => setContactOpen(true) }
                : {
                    nativeButton: false,
                    render: <a href={`mailto:${contact.email}`} />,
                  })}
            >
              <Mail aria-hidden="true" />
              Get in touch
            </Button>
          )}
        </div>
        <div className={styles.signature}>
          <span>{name}</span>
          <a href="#main-content">Back to the beginning ↑</a>
        </div>
      </footer>
      <Dialog
        open={Boolean(opened)}
        onOpenChange={(value) => {
          if (!value) setOpened(null);
        }}
      >
        <DialogContent className={styles.viewer} showCloseButton={false}>
          {opened && (
            <>
              <div className={styles.viewerTop}>
                <span>{opened.formats.join(" / ")}</span>
                <DialogClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close project"
                    />
                  }
                >
                  <X aria-hidden="true" />
                </DialogClose>
              </div>
              <DialogTitle className={`${styles.viewerTitle} font-heading`}>
                {opened.title}
              </DialogTitle>
              <DialogDescription>
                {opened.summary || `Work by ${name}`}
              </DialogDescription>
              {opened.image && (
                <div className={styles.viewerImage}>
                  <PortfolioImage
                    key={opened.image}
                    src={opened.image}
                    alt={opened.alt || opened.title}
                    eager
                  />
                </div>
              )}
              {opened.audio && (
                <>
                  <audio
                    controls
                    preload="metadata"
                    src={opened.audio}
                    onError={() => setAudioError(true)}
                    aria-label={opened.title}
                  />
                  {audioError && (
                    <p role="alert">
                      This recording could not load. The accompanying text is
                      still available below.
                    </p>
                  )}
                </>
              )}
              {opened.formats.includes("Sound") && !opened.audio && (
                <p className={styles.audioUnavailable}>
                  <Headphones aria-hidden="true" />
                  Audio isn’t available for this work yet.
                </p>
              )}
              {opened.text && (
                <div className={`${styles.reading} font-heading`}>
                  {opened.text}
                </div>
              )}
              {publicWebUrl(opened.url || "") && (
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={publicWebUrl(opened.url || "")}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Visit original work{" "}
                  <ArrowUpRight aria-label="opens in new tab" />
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogTitle>A sample of what’s possible.</DialogTitle>
          <DialogDescription>
            This is a fictional creator. A published portfolio opens the
            artist’s email or their own social profile here.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </main>
  );
}
