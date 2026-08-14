import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Mail,
  Music2,
  Play,
  Quote,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import styles from "./profile-portfolio-directions.module.css";

type EvidenceTier = "recorded" | "platform" | "linked" | "listed";
type SampleKind = "text" | "audio" | "video" | "image";

const evidenceLabels: Record<EvidenceTier, string> = {
  recorded: "recorded in Missa",
  platform: "confirmed on YouTube",
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

const fixtures = [
  ["01", "Text · established", "Excerpt, credits, and all evidence labels."],
  ["02", "Audio", "Native player, track list, and no autoplay."],
  ["03", "Moving image", "Poster frame, duration, and caption slot."],
  ["04", "Still image", "Contained artwork with required alternative text."],
  ["05", "New", "One credit, no sample, and no index signal."],
  ["06", "Empty", "Name and handle only."],
  ["07", "Private", "One clear privacy message and no identity leak."],
  ["08", "No sample", "The page keeps its rule and removes the empty slot."],
  [
    "09",
    "Sample unpublished",
    "The public sample is absent; Library content remains separate.",
  ],
  ["10", "Hidden credit", "The credit is absent from the public page."],
  [
    "11",
    "Dead link",
    "The credit is shown as listed and the owner is notified.",
  ],
  ["12", "Revoked connection", "The credit falls back to a checked link."],
  ["13", "Long values", "Long names and venues wrap without clipping."],
  ["14", "Many credits", "Forty credits stay readable as a year-led list."],
  ["15", "Save error", "The edit remains in place and the error is direct."],
  [
    "16",
    "Unclaimed handle",
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
        <audio
          controls
          preload="none"
          aria-label="Coastline Suite audio sample"
        >
          <track kind="captions" />
        </audio>
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
        <div className={styles.videoFrame}>
          <button
            type="button"
            className={styles.playButton}
            aria-label="Play The Dry Season Crossing"
          >
            <Play aria-hidden="true" fill="currentColor" />
          </button>
          <span>2:40 excerpt</span>
        </div>
        <div className={styles.sampleCaption}>
          <strong>The Dry Season Crossing</strong>
          <span>26-minute film</span>
          <EvidenceLabel tier="platform" />
        </div>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className={styles.imageSample}>
        <div
          className={styles.artwork}
          role="img"
          aria-label="Abstract painting in warm brown, blue, and cream tones"
        >
          <span>ROOM / GENERATOR / OFF</span>
        </div>
        <div className={styles.sampleCaption}>
          <strong>Room with the Generator Off</strong>
          <span>Oil on linen · 150 × 120 cm</span>
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
        <span>Excerpt · 380 words</span>
      </div>
    </div>
  );
}

function CreditList({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`${styles.credits} ${compact ? styles.compactCredits : ""}`}
    >
      {credits.map((credit) => (
        <article
          className={styles.credit}
          key={`${credit.year}-${credit.title}`}
        >
          <time>{credit.year}</time>
          <div>
            <strong>{credit.title}</strong>
            <span>{credit.venue}</span>
            <EvidenceLabel tier={credit.evidence} />
          </div>
        </article>
      ))}
    </div>
  );
}

function PublicProfile({ kind = "text" }: { kind?: SampleKind }) {
  return (
    <article className={styles.publicProfile}>
      <header className={styles.identity}>
        <div>
          <p className={styles.kicker}>Public Profile</p>
          <h2>Amaka Obi</h2>
          <p className={styles.handle}>@amaka</p>
          <p className={styles.roleLine}>Essayist · Screenwriter · Lagos</p>
          <p className={styles.oneLine}>
            Writing essays and scripts about ordinary life.
          </p>
        </div>
        <a className={styles.externalLink} href="#contact">
          Share Profile <ArrowUpRight aria-hidden="true" />
        </a>
      </header>
      <Separator />
      <section className={styles.sampleRegion} aria-labelledby="sample-title">
        <div className={styles.sectionLabel}>
          <span id="sample-title">Selected Work</span>
          <span>Public</span>
        </div>
        <Sample kind={kind} />
        <p className={styles.sampleSource}>
          From the writer’s Library · published sample
        </p>
      </section>
      <section className={styles.creditRegion} aria-labelledby="credits-title">
        <div className={styles.sectionLabel}>
          <span id="credits-title">Credits</span>
          <span>3 public</span>
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
    </article>
  );
}

function OwnerProfile() {
  return (
    <article className={`${styles.publicProfile} ${styles.ownerProfile}`}>
      <div className={styles.ownerNotice}>
        <Check aria-hidden="true" />
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
        <div>
          <p className={styles.kicker}>Your public Profile</p>
          <h2>Amaka Obi</h2>
          <p className={styles.handle}>@amaka</p>
          <p className={styles.roleLine}>Essayist · Screenwriter · Lagos</p>
          <label className={styles.inlineLabel} htmlFor="profile-one-line">
            One line · 42 / 100 characters
          </label>
          <input
            id="profile-one-line"
            defaultValue="Writing essays and scripts about ordinary life."
          />
        </div>
      </header>
      <Separator />
      <section className={styles.sampleRegion}>
        <div className={styles.sectionLabel}>
          <span>Selected Work</span>
          <span>Public · from Library</span>
        </div>
        <Sample kind="text" />
        <div className={styles.inlineActions}>
          <Button type="button" variant="outline">
            Change Work
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
        <div className={styles.hiddenCredit}>
          <X aria-hidden="true" />
          <span>Hidden — only you can see this</span>
          <Button type="button" variant="ghost">
            Show
          </Button>
        </div>
        <Button type="button" variant="outline">
          <ChevronRight aria-hidden="true" />
          Add a credit
        </Button>
      </section>
      <div className={styles.saveBar}>
        <span>2 unsaved changes</span>
        <div>
          <Button type="button" variant="ghost">
            Discard
          </Button>
          <Button type="button">Save and publish</Button>
        </div>
      </div>
    </article>
  );
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
                All states are present in the review surface before promotion
                work begins.
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
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
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
                Use native audio and video controls. Do not autoplay or decorate
                an empty sample slot.
              </p>
            </div>
            <div>
              <Check aria-hidden="true" />
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
