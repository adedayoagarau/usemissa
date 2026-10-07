"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Clapperboard, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortfolioPublicationPicker } from "@/components/portfolio-publication-picker";
import {
  createItemId,
  type PortfolioChapter,
} from "@/lib/creator-portfolio-schema";
import { publicWebUrl } from "@/lib/creator-portfolio-draft";
import {
  chapterTimeIssue,
  detectVideo,
  hasCaseStudy,
  hasWallLabel,
  wallLabelText,
} from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import { AreaField, ItemList, TextField } from "./studio-editors";
import type { WorkFieldsProps } from "./work-fields";
import styles from "./profile-studio.module.css";
import fx from "./work-format-fields.module.css";

/**
 * What makes a work more than words: the wall label of an image, a film link,
 * chapters and a transcript for a film or recording, and a case study. They
 * appear only when they apply, so a poem's row stays short:
 *
 * - wall label: once the work has an image;
 * - film: on request, or already open when a link is set;
 * - chapters and transcript: once there is audio or a film;
 * - case study: open for the Design lens or when a case-study field is set,
 *   otherwise on request.
 */
export function WorkFormatFields({ work, lens, change }: WorkFieldsProps) {
  const [showFilm, setShowFilm] = useState(Boolean(work.video.trim()));
  const [showCase, setShowCase] = useState(
    lens === "design" || hasCaseStudy(work) || Boolean(work.clientOrganization),
  );
  // Focus the first field of a group a person has just asked for.
  const asked = useRef<"film" | "case" | null>(null);
  const filmGroup = useRef<HTMLFieldSetElement>(null);
  const caseGroup = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    const target = asked.current === "film" ? filmGroup : caseGroup;
    if (asked.current)
      target.current?.querySelector<HTMLElement>("input, textarea")?.focus();
    asked.current = null;
  }, [showFilm, showCase]);

  const wallLabel =
    Boolean(work.image) || hasWallLabel(work) || Boolean(work.series);
  const timed = Boolean(work.audio) || Boolean(work.video.trim());
  return (
    <>
      {wallLabel && (
        <fieldset className={styles.group}>
          <legend>Wall label</legend>
          <p className={styles.hint}>
            The caption a gallery prints beside a work. Each part is optional.
          </p>
          <TextField
            label="Series"
            value={work.series}
            maxLength={80}
            placeholder="Indigo Hours"
            hint="Works with the same series name sit together under a heading on your profile."
            onChange={(series) => change({ series })}
          />
          <div className={styles.pair}>
            <TextField
              label="Medium"
              value={work.medium}
              maxLength={120}
              placeholder="Relief print on Kozo paper"
              onChange={(medium) => change({ medium })}
            />
            <TextField
              label="Size"
              value={work.size}
              maxLength={80}
              placeholder="56 × 76 cm"
              onChange={(size) => change({ size })}
            />
          </div>
          <TextField
            label="Edition"
            value={work.edition}
            maxLength={60}
            placeholder="Edition of 12"
            onChange={(edition) => change({ edition })}
          />
          {hasWallLabel(work) && (
            <p className={styles.hint} aria-live="polite">
              On your profile: <em>{wallLabelText(work)}</em>
            </p>
          )}
        </fieldset>
      )}

      {showFilm && (
        <fieldset ref={filmGroup} className={styles.group}>
          <legend>Film</legend>
          <FilmLink
            value={work.video}
            hasImage={Boolean(work.image)}
            onChange={(video) => change({ video })}
          />
        </fieldset>
      )}

      {timed && (
        <fieldset className={styles.group}>
          <legend>Chapters and transcript</legend>
          <p className={styles.hint}>
            Chapters let visitors jump to a time. A transcript opens under the
            player for anyone who can’t listen or watch.
          </p>
          <ItemList<PortfolioChapter>
            items={work.chapters}
            onChange={(chapters) => change({ chapters })}
            noun="chapter"
            max={40}
            addLabel="Add chapter"
            empty="No chapters yet. Add a time and a title, like 03:12 The rope."
            titleOf={(chapter) => chapter.title}
            metaOf={(chapter) => chapter.at}
            create={() => ({ id: createItemId("ch"), at: "", title: "" })}
          >
            {(chapter, patch) => (
              <>
                <ChapterTime
                  key={chapter.id}
                  value={chapter.at}
                  onChange={(at) => patch({ at })}
                />
                <TextField
                  label="Title"
                  required
                  value={chapter.title}
                  maxLength={120}
                  placeholder="The rope"
                  onChange={(title) => patch({ title })}
                />
              </>
            )}
          </ItemList>
          <AreaField
            label="Transcript"
            rows={8}
            value={work.transcript}
            maxLength={30000}
            hint="Words spoken or sung, and sounds that matter. Line breaks are kept."
            onChange={(transcript) => change({ transcript })}
          />
        </fieldset>
      )}

      {showCase && (
        <fieldset ref={caseGroup} className={styles.group}>
          <legend>Case study</legend>
          <p className={styles.hint}>
            For commissioned work. Visitors see these as labelled facts when
            they open the work.
          </p>
          <AreaField
            label="Brief"
            rows={3}
            value={work.brief}
            maxLength={300}
            hint="What you were asked to make, in a sentence or two."
            onChange={(brief) => change({ brief })}
          />
          <TextField
            label="Your role"
            value={work.role}
            maxLength={200}
            placeholder="Lead designer, with two illustrators"
            onChange={(role) => change({ role })}
          />
          <PortfolioPublicationPicker
            name={work.client}
            organization={work.clientOrganization}
            onChange={(client, clientOrganization) =>
              change({ client, clientOrganization })
            }
          />
          <p className={styles.hint}>
            This is the client. Linking them shows their directory profile on
            your page.
          </p>
          <TextField
            label="Outcome"
            value={work.outcome}
            maxLength={300}
            placeholder="Launched April 2026"
            onChange={(outcome) => change({ outcome })}
          />
        </fieldset>
      )}

      {(!showFilm || !showCase) && (
        <div className={fx.more}>
          {!showFilm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                asked.current = "film";
                setShowFilm(true);
              }}
            >
              <Clapperboard aria-hidden="true" />
              Add a film link
            </Button>
          )}
          {!showCase && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                asked.current = "case";
                setShowCase(true);
              }}
            >
              <Briefcase aria-hidden="true" />
              Add case study details
            </Button>
          )}
        </div>
      )}
    </>
  );
}

/** The film link, with plain words about what a visitor will get from it. */
function FilmLink({
  value,
  hasImage,
  onChange,
}: {
  value: string;
  hasImage: boolean;
  onChange: (value: string) => void;
}) {
  const link = value.trim();
  const source = link ? detectVideo(link) : null;
  const valid = link ? publicWebUrl(link) : undefined;
  let note =
    "A YouTube or Vimeo link. It plays on your profile only after a visitor presses play.";
  if (link && !valid)
    note = "Use a full link beginning with https:// or http://.";
  else if (source)
    note = `${source.providerName} link recognized. Nothing loads from ${source.providerName} until a visitor presses play.`;
  else if (valid)
    note =
      "This isn’t a YouTube or Vimeo link, so it opens as an ordinary link in a new tab.";
  return (
    <>
      <TextField
        label="Film link"
        type="url"
        value={value}
        placeholder="https://"
        hint={note}
        onChange={onChange}
      />
      {link && (
        <p className={styles.hint}>
          {hasImage
            ? "The image above is the film’s poster."
            : "Add an image above to use as the film’s poster."}
        </p>
      )}
    </>
  );
}

/**
 * A chapter's time. A time that isn't minutes and seconds is flagged and held
 * back from the draft, so a half-typed "09:" never reaches a save.
 */
function ChapterTime({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const issue = chapterTimeIssue(text);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>Time</label>
      <Input
        id={id}
        value={text}
        placeholder="09:40"
        maxLength={8}
        autoComplete="off"
        aria-invalid={issue ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          // Only a real time, or none, goes into the draft.
          if (!chapterTimeIssue(next)) onChange(next.trim());
        }}
      />
      <p
        id={`${id}-hint`}
        aria-live="polite"
        className={cn(styles.hint, issue && fx.warning)}
      >
        {issue
          ? `${issue} This time isn’t saved yet.`
          : "Minutes and seconds, like 09:40. Past an hour, 1:02:30."}
      </p>
    </div>
  );
}
