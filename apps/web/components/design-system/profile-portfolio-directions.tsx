"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { ArrowUpRight, Mail, Music2, Play, Quote } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";

import styles from "./profile-portfolio-directions.module.css";

type EvidenceTier = "recorded" | "platform" | "linked" | "listed";
type SampleKind = "text" | "audio" | "video" | "image";
type Credit = {
  year: string;
  title: string;
  venue: string;
  evidence?: EvidenceTier;
};

const evidenceLabels: Record<EvidenceTier, string> = {
  recorded: "recorded in Missa",
  platform: "confirmed on Spotify",
  linked: "link checked 3 days ago",
  listed: "listed by the writer",
};

const credits = [
  {
    year: "2026",
    title: "The Harmattan Year",
    venue: "Granta",
    evidence: "recorded" as EvidenceTier,
  },
  {
    year: "2025",
    title: "Notes on a Borrowed House",
    venue: "Chimurenga",
    evidence: "linked" as EvidenceTier,
  },
  {
    year: "2023",
    title: "Second Person, Plural",
    venue: "Saraba · print issue 24",
    evidence: "listed" as EvidenceTier,
  },
];

const volumeCredits = Array.from({ length: 40 }, (_, index) => ({
  year: String(2026 - Math.floor(index / 4)),
  title: `Published piece ${index + 1}`,
  venue: index % 2 ? "The Republic" : "Granta",
}));

const fixtures = [
  ["01", "Text · established", "Excerpt, credits, and all evidence labels."],
  ["02", "Audio", "Native audio with a custom control surface."],
  ["03", "Moving image", "Native video with custom play controls."],
  ["04", "Still image", "Contained artwork with alternative text."],
  ["05", "New", "One credit, no sample, and no index signal."],
  ["06", "Empty", "Name and handle only."],
  ["07", "Fully private", "A privacy message with no identity leak."],
  ["08", "No image", "Identity remains deliberate without an image or sample."],
  [
    "09",
    "Sample unpublished",
    "The public sample is absent; Library content remains separate.",
  ],
  ["10", "Hidden credit", "The real credit row remains visible to the owner."],
  ["11", "Dead link", "The credit demotes to listed and the owner is told."],
  ["12", "Revoked connection", "The credit demotes to a checked link."],
  ["13", "Long values", "Long names and venues wrap without clipping."],
  ["14", "Forty credits", "A high-volume year-led list remains readable."],
  ["15", "Mutation failure", "The edit stays in place with a direct error."],
  [
    "16",
    "Handle not claimed",
    "The owner view works before a public page exists.",
  ],
] as const;

function EvidenceLabel({ tier }: { tier: EvidenceTier }) {
  return (
    <span
      className={`${styles.evidence} ${tier === "recorded" || tier === "platform" ? styles.strongEvidence : ""}`}
    >
      {evidenceLabels[tier]}
    </span>
  );
}

function CustomAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggleAudio() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    void audioRef.current.play().catch(() => setPlaying(false));
    setPlaying(true);
  }

  return (
    <div className={styles.customMediaControls}>
      <audio
        ref={audioRef}
        preload="none"
        aria-label="Coastline Suite audio sample"
      />
      <button
        type="button"
        className={styles.mediaButton}
        onClick={toggleAudio}
        aria-label={playing ? "Pause Coastline Suite" : "Play Coastline Suite"}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <span className={styles.waveform} aria-hidden="true">
        ▂▅▃▇▅▂▆▃▅▇▂
      </span>
      <span className={styles.mediaMeta}>0:00 / 6:12</span>
    </div>
  );
}

function CustomVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggleVideo() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
      return;
    }
    void videoRef.current.play().catch(() => setPlaying(false));
    setPlaying(true);
  }

  return (
    <AspectRatio ratio={16 / 9} className={styles.videoFrame}>
      <video
        ref={videoRef}
        preload="none"
        aria-label="The Dry Season Crossing video sample"
      />
      <button
        type="button"
        className={styles.playButton}
        onClick={toggleVideo}
        aria-label={
          playing
            ? "Pause The Dry Season Crossing"
            : "Play The Dry Season Crossing"
        }
      >
        <Play aria-hidden="true" fill="currentColor" />
      </button>
      <span>2:40 excerpt</span>
    </AspectRatio>
  );
}

function Sample({ kind }: { kind: SampleKind }) {
  if (kind === "audio") {
    return (
      <div className={styles.audioSample}>
        <div className={styles.audioIntro}>
          <Music2 aria-hidden="true" />
          <div>
            <strong>Coastline Suite</strong>
            <span>Kelele Records · 2026</span>
          </div>
        </div>
        <CustomAudio />
        <ol className={styles.trackList}>
          <li>
            <span>1</span>
            <span>Approach</span>
            <time>6:12</time>
          </li>
          <li>
            <span>2</span>
            <span>Salt Road</span>
            <time>4:48</time>
          </li>
        </ol>
        <EvidenceLabel tier="platform" />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={styles.videoSample}>
        <CustomVideo />
        <div className={styles.sampleCaption}>
          <strong>The Dry Season Crossing</strong>
          <span>26-minute film · 2026</span>
          <EvidenceLabel tier="platform" />
        </div>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className={styles.imageSample}>
        <AspectRatio
          ratio={4 / 5}
          className={styles.artwork}
          role="img"
          aria-label="Abstract painting in warm brown, blue, and cream tones"
        >
          <span>ROOM / GENERATOR / OFF</span>
        </AspectRatio>
        <div className={styles.sampleCaption}>
          <strong>Room with the Generator Off</strong>
          <span>Oil on linen · 150 × 120 cm · 2026</span>
          <EvidenceLabel tier="listed" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.textSample}>
      <p>
        <span className={styles.dropCap}>T</span>he dust came early that year,
        three weeks before anyone thought to cover the windows. My grandmother
        announced it as if the weather had called first. We swept twice a day.
      </p>
      <div className={styles.sampleCaption}>
        <strong>The Harmattan Year</strong>
        <span>Granta · 2026 · excerpt · 380 words</span>
        <EvidenceLabel tier="recorded" />
      </div>
    </div>
  );
}

function CreditList({
  items = credits,
  hidden = false,
}: {
  items?: Credit[];
  hidden?: boolean;
}) {
  return (
    <ItemGroup
      className={`${styles.credits} ${hidden ? styles.hiddenCredits : ""}`}
    >
      {items.map((credit, index) => (
        <div key={`${credit.year}-${credit.title}`}>
          <Item className={styles.credit}>
            <ItemMedia className={styles.creditYear}>
              <time>{credit.year}</time>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{credit.title}</ItemTitle>
              <ItemDescription>
                {credit.venue || "Venue not listed"}
              </ItemDescription>
              {credit.evidence && <EvidenceLabel tier={credit.evidence} />}
            </ItemContent>
          </Item>
          {index < items.length - 1 && <ItemSeparator />}
        </div>
      ))}
    </ItemGroup>
  );
}

function ProfilePhoto() {
  return (
    <Avatar size="lg" className={styles.profilePhoto}>
      <AvatarImage src="/media/home/artist-at-work.webp" alt="Profile photo" />
      <AvatarFallback>AO</AvatarFallback>
    </Avatar>
  );
}

function EmptyFixture({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className={styles.fixtureEmpty}>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function PublicProfile({ kind = "text" }: { kind?: SampleKind }) {
  return (
    <Card className={styles.publicProfile}>
      <CardContent>
        <header className={styles.identity}>
          <ProfilePhoto />
          <div>
            <h2>Amaka Obi</h2>
            <p className={styles.handle}>@amaka</p>
            <p className={styles.roleLine}>Essayist · Screenwriter · Lagos</p>
            <p className={styles.oneLine}>
              Writing essays and scripts about ordinary life.
            </p>
          </div>
        </header>
        <Separator />
        <section className={styles.sampleRegion} aria-labelledby="sample-title">
          <div className={styles.sectionLabel}>
            <span id="sample-title">Selected Work</span>
          </div>
          <Sample kind={kind} />
        </section>
        <section
          className={styles.creditRegion}
          aria-labelledby="credits-title"
        >
          <div className={styles.sectionLabel}>
            <span id="credits-title">Credits</span>
          </div>
          <CreditList />
        </section>
        <section
          className={styles.rail}
          id="contact"
          aria-label="Profile contact details"
        >
          <div>
            <span className={styles.railLabel}>Open to</span>
            <p>Commissions, residencies, essay assignments.</p>
          </div>
          <div>
            <span className={styles.railLabel}>Elsewhere</span>
            <a href="#elsewhere">
              amakaobi.com <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
          <Button type="button">
            <Mail aria-hidden="true" /> Contact Amaka
          </Button>
        </section>
      </CardContent>
    </Card>
  );
}

function OwnerProfile() {
  const [hidden, setHidden] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <Card className={`${styles.publicProfile} ${styles.ownerProfile}`}>
      <CardContent>
        <div className={styles.ownerNotice}>
          <span>
            You are editing your public Profile. Save to publish changes.
          </span>
          <div>
            <Button type="button" variant="ghost">
              View as visitor
            </Button>
            <Button type="button" variant="ghost">
              Copy link
            </Button>
          </div>
        </div>
        <header className={styles.identity}>
          <ProfilePhoto />
          <div>
            <Field>
              <FieldLabel htmlFor="profile-name">Name</FieldLabel>
              <FieldContent>
                <Input id="profile-name" defaultValue="Amaka Obi" />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-handle">Handle</FieldLabel>
              <FieldContent>
                <Input
                  id="profile-handle"
                  className={styles.metadataInput}
                  defaultValue="@amaka"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-label">Creator label</FieldLabel>
              <FieldContent>
                <Input
                  id="profile-label"
                  className={styles.metadataInput}
                  defaultValue="Essayist · Screenwriter · Lagos"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-one-line">One line</FieldLabel>
              <FieldContent>
                <Input
                  id="profile-one-line"
                  defaultValue="Writing essays and scripts about ordinary life."
                />
                <FieldDescription>42 / 100 characters</FieldDescription>
              </FieldContent>
            </Field>
            <Button type="button" variant="outline">
              Change photo
            </Button>
          </div>
        </header>
        <Separator />
        <section className={styles.sampleRegion}>
          <div className={styles.sectionLabel}>
            <span>Selected Work</span>
            <span>Public</span>
          </div>
          <Sample kind="text" />
          <div className={styles.inlineActions}>
            <Button type="button" variant="outline">
              Change passage
            </Button>
            <Button type="button" variant="ghost">
              Unpublish
            </Button>
          </div>
        </section>
        <section className={styles.creditRegion}>
          <div className={styles.sectionLabel}>
            <span>Credits</span>
            <span>3 public · 1 hidden</span>
          </div>
          <CreditList />
          <Item
            className={`${styles.credit} ${hidden ? styles.hiddenCredit : styles.shownCredit}`}
          >
            <ItemMedia className={styles.creditYear}>
              <time>2024</time>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Ordinary Weather</ItemTitle>
              <ItemDescription>The Republic</ItemDescription>
              <span className={styles.hiddenLabel}>
                {hidden ? "Hidden — only you can see this" : "Public"}
              </span>
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setHidden((value) => !value)}
              >
                {hidden ? "Show" : "Hide"}
              </Button>
            </ItemActions>
          </Item>
          <Button type="button" variant="outline">
            ＋ Add a credit — or pull one from Tracker, where 3 acceptances are
            recorded.
          </Button>
        </section>
        <div className={styles.saveBar} data-saved={saved} role="status">
          <span>2 unsaved changes</span>
          <div>
            <Button type="button" variant="ghost">
              Discard
            </Button>
            <Button
              type="button"
              onClick={() => {
                setSaved(true);
                toast("Profile published.");
              }}
            >
              Save and publish
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FixturePreview({ number }: { number: string }) {
  if (number === "07")
    return (
      <EmptyFixture
        title="This profile is private."
        description="Nothing on this page is available to visitors."
      />
    );
  if (number === "10")
    return (
      <CreditList
        items={[
          {
            year: "2024",
            title: "Ordinary Weather",
            venue: "The Republic",
            evidence: "listed" as EvidenceTier,
          },
        ]}
        hidden
      />
    );
  if (number === "11")
    return (
      <CreditList
        items={[
          {
            year: "2024",
            title: "A House Near the Water",
            venue: "The Republic",
            evidence: "listed" as EvidenceTier,
          },
        ]}
      />
    );
  if (number === "12")
    return (
      <CreditList
        items={[
          {
            year: "2024",
            title: "Coastline Suite",
            venue: "Kelele Records",
            evidence: "linked" as EvidenceTier,
          },
        ]}
      />
    );
  if (number === "13")
    return (
      <div className={styles.miniProfile}>
        <h3>Amaka Obi-Williams, Jr.</h3>
        <p>amaka-obi-williams-long-handle</p>
        <CreditList
          items={[
            {
              year: "2026",
              title:
                "A very long title that wraps across the available content column",
              venue: "The Journal with a Very Long Name for Demonstration",
              evidence: "listed" as EvidenceTier,
            },
          ]}
        />
      </div>
    );
  if (number === "14")
    return (
      <div className={styles.volumePreview}>
        <CreditList items={volumeCredits} />
        <span className={styles.volumeCount}>40 credits</span>
      </div>
    );
  if (number === "15")
    return (
      <div className={styles.errorPreview}>
        <label htmlFor="fixture-error">One line</label>
        <input
          id="fixture-error"
          defaultValue="Writing essays and scripts about ordinary life."
        />
        <p role="alert">Could not save this change. Your edit is still here.</p>
      </div>
    );
  if (number === "16")
    return (
      <div className={styles.miniProfile}>
        <h3>Amaka Obi</h3>
        <p>@amaka</p>
        <p className={styles.ownerOnly}>
          Handle not claimed · public page unavailable
        </p>
      </div>
    );
  if (number === "08")
    return (
      <EmptyFixture
        title="No profile photo or selected work"
        description="The page remains intentionally quiet until the creator publishes something."
      />
    );
  if (number === "09")
    return (
      <EmptyFixture
        title="No selected work is published"
        description="The private Library remains unchanged."
      />
    );
  if (["05", "06"].includes(number))
    return (
      <div className={styles.miniProfile}>
        <h3>{number === "06" ? "Amaka Obi" : "Tomiwa Ade"}</h3>
        <p>{number === "06" ? "@amaka" : "@tomiwa"}</p>
        {number === "05" && (
          <CreditList
            items={[
              {
                year: "2025",
                title: "Two poems",
                venue: "",
                evidence: "listed" as EvidenceTier,
              },
            ]}
          />
        )}
      </div>
    );
  if (number === "02") return <Sample kind="audio" />;
  if (number === "03") return <Sample kind="video" />;
  if (number === "04") return <Sample kind="image" />;
  return <Sample kind="text" />;
}

export function ProfilePortfolioDirections() {
  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#profile-review">
        Skip to Profile review
      </a>
      <header className={styles.reviewHeader}>
        <div>
          <p className={styles.reviewKicker}>
            Missa · build reference · Profile portfolio · 14 August 2026
          </p>
          <h1>Selected composition</h1>
          <p>
            Direction C opening over A body. Review-only surface; product routes
            remain unchanged.
          </p>
        </div>
        <span className={styles.reviewBadge}>Local review only</span>
      </header>
      <div id="profile-review" className={styles.reviewGrid}>
        <section
          className={styles.reviewSection}
          aria-labelledby="public-title"
        >
          <div className={styles.sectionHeader}>
            <span>01</span>
            <div>
              <h2 id="public-title">Public page</h2>
              <p>
                Signed-out view. The sample changes by medium; the page
                structure does not.
              </p>
            </div>
          </div>
          <PublicProfile />
        </section>
        <section
          className={styles.reviewSection}
          aria-labelledby="medium-title"
        >
          <div className={styles.sectionHeader}>
            <span>02</span>
            <div>
              <h2 id="medium-title">Sample modes</h2>
              <p>
                Each mode uses the Work’s saved medium. Empty slots are omitted.
              </p>
            </div>
          </div>
          <div className={styles.modeGrid}>
            {(["audio", "video", "image"] as SampleKind[]).map((kind) => (
              <article className={styles.modeCard} key={kind}>
                <div className={styles.modeHeading}>
                  <span>{kind}</span>
                  <span>Sample</span>
                </div>
                <Sample kind={kind} />
              </article>
            ))}
          </div>
        </section>
        <section className={styles.reviewSection} aria-labelledby="owner-title">
          <div className={styles.sectionHeader}>
            <span>03</span>
            <div>
              <h2 id="owner-title">Owner mode</h2>
              <p>Edit in place. Visibility is written beside each section.</p>
            </div>
          </div>
          <OwnerProfile />
        </section>
        <section
          className={styles.reviewSection}
          aria-labelledby="fixture-title"
        >
          <div className={styles.sectionHeader}>
            <span>04</span>
            <div>
              <h2 id="fixture-title">Fixture coverage</h2>
              <p>
                Every contract state renders here before promotion work begins.
              </p>
            </div>
          </div>
          <div className={styles.fixtureGrid}>
            {fixtures.map(([number, title, description]) => (
              <article
                className={styles.fixture}
                key={number}
                data-fixture={number}
              >
                <div className={styles.fixtureHeading}>
                  <span>{number}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </div>
                <FixturePreview number={number} />
              </article>
            ))}
          </div>
        </section>
        <section className={styles.reviewSection} aria-labelledby="rules-title">
          <div className={styles.sectionHeader}>
            <span>05</span>
            <div>
              <h2 id="rules-title">Build rules</h2>
              <p>
                Small rules that protect the page from turning into a dashboard.
              </p>
            </div>
          </div>
          <div className={styles.rules}>
            <div>
              <Quote aria-hidden="true" />
              <strong>Public copy</strong>
              <p>
                Use the person’s words, specific roles, and concrete Work
                details. Keep private choices out.
              </p>
            </div>
            <div>
              <Music2 aria-hidden="true" />
              <strong>Media</strong>
              <p>
                Use the native audio or video element with a custom control
                surface built from Missa tokens. No autoplay.
              </p>
            </div>
            <div>
              <Quote aria-hidden="true" />
              <strong>Evidence</strong>
              <p>
                Use plain labels for how a credit was recorded. Do not imply
                endorsement.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
