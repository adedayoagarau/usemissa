import { ArrowUpRight } from "lucide-react";
import type {
  ProfileSelectedWork,
  ProfileSocialService,
  PublicUserProfile,
} from "@missa/radar-engine";

import { ProfileContactDialog } from "@/components/profile-contact-dialog";
import { ProfileMediaSample } from "@/components/profile-media-sample";
import { ProfileReportDialog } from "@/components/profile-report-dialog";
import { ProfileShareActions } from "@/components/profile-share-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import styles from "./public-profile-view.module.css";

export const PROFILE_SOCIAL_LABELS: Record<ProfileSocialService, string> = {
  website: "Website",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  bluesky: "Bluesky",
  x: "X",
  mastodon: "Mastodon",
  substack: "Substack",
  medium: "Medium",
  behance: "Behance",
  vimeo: "Vimeo",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  other: "Other link",
};

function initials(name: string): string {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ProfilePortrait({ profile }: { profile: PublicUserProfile }) {
  return (
    <Avatar className={styles.portrait}>
      {profile.profileImageUrl ? (
        <AvatarImage
          className={styles.portraitImage}
          src={profile.profileImageUrl}
          alt=""
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback className={styles.portraitFallback} aria-hidden="true">
        {initials(profile.displayName ?? "Profile")}
      </AvatarFallback>
    </Avatar>
  );
}

function workMeta(work: ProfileSelectedWork): string | undefined {
  return [work.publication, work.year].filter(Boolean).join(" · ") || undefined;
}

function WorkRow({ work }: { work: ProfileSelectedWork }) {
  const content = (
    <>
      <ItemMedia className={styles.workYear}>
        {work.year ? (
          <time dateTime={String(work.year)}>{work.year}</time>
        ) : null}
      </ItemMedia>
      <ItemContent>
        <ItemTitle className={styles.workTitle}>{work.title}</ItemTitle>
        {work.publication || work.description ? (
          <ItemDescription className={styles.workDescription}>
            {[work.publication, work.description].filter(Boolean).join(" · ")}
          </ItemDescription>
        ) : null}
      </ItemContent>
      {work.url ? (
        <ItemActions>
          <ArrowUpRight aria-hidden="true" />
        </ItemActions>
      ) : null}
    </>
  );
  return work.url ? (
    <Item
      className={`${styles.workRow} ${styles.rowLink}`}
      render={
        <a
          href={work.url}
          target="_blank"
          rel="nofollow ugc noopener noreferrer"
        />
      }
    >
      {content}
    </Item>
  ) : (
    <Item className={styles.workRow}>{content}</Item>
  );
}

function FeaturedSample({ work }: { work: ProfileSelectedWork }) {
  const sample = work.sample;
  if (!sample) return null;
  if (sample.kind === "text" && sample.excerpt) {
    return (
      <blockquote className={styles.textSample}>
        {sample.excerpt.split(/\n{2,}/u).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </blockquote>
    );
  }
  if (sample.kind === "image" && sample.publicAssetUrl) {
    return (
      <figure className={styles.imageSample}>
        {/* Creator-supplied public media can have arbitrary dimensions. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sample.publicAssetUrl} alt={sample.accessibilityText ?? ""} />
      </figure>
    );
  }
  if (
    (sample.kind === "audio" || sample.kind === "video") &&
    sample.publicAssetUrl
  )
    return <ProfileMediaSample sample={sample} title={work.title} />;
  return null;
}

function workAction(work: ProfileSelectedWork): string {
  switch (work.sample?.kind) {
    case "text":
      return "Read this Work";
    case "audio":
      return "Listen to this Work";
    case "video":
      return "Watch this Work";
    case "image":
      return "View this Work";
    default:
      return "Open this Work";
  }
}

export function PublicProfileView({
  profile,
  handle,
  shareUrl,
}: {
  profile: PublicUserProfile;
  handle?: string;
  shareUrl: string;
}) {
  if (profile.isPrivate) {
    return (
      <main
        id="main-content"
        className={`${styles.main} ${styles.privateState}`}
        data-density="comfortable"
      >
        <Empty>
          <EmptyHeader>
            <EmptyTitle role="heading" aria-level={1}>
              This Profile is private.
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  const displayName = profile.displayName ?? "Creator Profile";
  const works = profile.selectedWorks ?? [];
  const [featuredWork, ...otherWorks] = works;
  const socialLinks = profile.socialLinks ?? [];

  return (
    <main id="main-content" className={styles.main} data-density="comfortable">
      <header className={styles.profileHeader}>
        <Item className={styles.identity}>
          <ItemMedia>
            <ProfilePortrait profile={profile} />
          </ItemMedia>
          <ItemContent className={styles.identityContent}>
            <h1>{displayName}</h1>
            {handle ? <p className={styles.handle}>@{handle}</p> : null}
            {profile.headline ? (
              <p className={styles.headline}>{profile.headline}</p>
            ) : null}
            {profile.oneLine ? (
              <p className={styles.oneLine}>{profile.oneLine}</p>
            ) : null}
          </ItemContent>
        </Item>
        <div className={styles.profileActions}>
          {profile.contactEnabled && profile.id ? (
            <ProfileContactDialog
              displayName={displayName}
              userId={profile.id}
            />
          ) : null}
          <ProfileShareActions displayName={displayName} url={shareUrl} />
        </div>
      </header>

      <div className={styles.content}>
        {featuredWork ? (
          <section
            className={styles.section}
            aria-labelledby="selected-work-title"
          >
            <p className={styles.sectionLabel}>Selected Work</p>
            <article className={styles.featuredWork}>
              <h2 id="selected-work-title">{featuredWork.title}</h2>
              {workMeta(featuredWork) ? (
                <p className={styles.workMeta}>{workMeta(featuredWork)}</p>
              ) : null}
              <FeaturedSample work={featuredWork} />
              {featuredWork.description ? (
                <p>{featuredWork.description}</p>
              ) : null}
              {featuredWork.url ? (
                <a
                  className={styles.workLink}
                  href={featuredWork.url}
                  target="_blank"
                  rel="nofollow ugc noopener noreferrer"
                >
                  {workAction(featuredWork)} <ArrowUpRight aria-hidden="true" />
                </a>
              ) : null}
            </article>
          </section>
        ) : null}

        {profile.bio ? (
          <section className={styles.section} aria-labelledby="about-title">
            <h2 id="about-title" className={styles.sectionLabel}>
              About
            </h2>
            <p className={styles.about}>{profile.bio}</p>
          </section>
        ) : null}

        {otherWorks.length ? (
          <section className={styles.section} aria-labelledby="more-work-title">
            <h2 id="more-work-title" className={styles.sectionLabel}>
              More Work
            </h2>
            <ItemGroup className={styles.workList}>
              {otherWorks.map((work, index) => (
                <div key={work.id} role="listitem">
                  <WorkRow work={work} />
                  {index < otherWorks.length - 1 ? (
                    <ItemSeparator className={styles.separator} />
                  ) : null}
                </div>
              ))}
            </ItemGroup>
          </section>
        ) : null}
      </div>

      {profile.openTo || socialLinks.length ? (
        <div className={styles.rail}>
          {profile.openTo ? (
            <section
              className={styles.railSection}
              aria-labelledby="open-to-title"
            >
              <h2 id="open-to-title" className={styles.sectionLabel}>
                Open to
              </h2>
              <p>{profile.openTo}</p>
            </section>
          ) : null}
          {socialLinks.length ? (
            <section
              className={styles.railSection}
              aria-labelledby="elsewhere-title"
            >
              <h2 id="elsewhere-title" className={styles.sectionLabel}>
                Elsewhere
              </h2>
              <ItemGroup className={styles.socialList}>
                {socialLinks.map((link, index) => (
                  <div key={link.id} role="listitem">
                    <Item className={styles.socialRow}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="nofollow ugc noopener noreferrer"
                      >
                        <span>{PROFILE_SOCIAL_LABELS[link.service]}</span>
                        <ArrowUpRight aria-hidden="true" />
                      </a>
                    </Item>
                    {index < socialLinks.length - 1 ? (
                      <ItemSeparator className={styles.separator} />
                    ) : null}
                  </div>
                ))}
              </ItemGroup>
            </section>
          ) : null}
        </div>
      ) : null}
      {profile.id ? (
        <footer className={styles.profileFooter}>
          <ProfileReportDialog userId={profile.id} />
        </footer>
      ) : null}
    </main>
  );
}
