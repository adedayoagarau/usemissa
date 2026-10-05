import type { Metadata } from "next";
import Link from "next/link";
import {
  LITERARY_PRIZES,
  PRIZE_COLLECTIONS,
  PRIZE_REGION_LABELS,
  recognisedPublications,
  type LiteraryPrize,
  type PrizeRegion,
  type PrizeWinner,
} from "@missa/radar-adapters";
import { PublicSiteShell } from "@/components/public-site-shell";
import { PrizeWinnersDisclosure } from "@/components/discover/prize-winners-disclosure";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pageMetadata } from "@/lib/seo";
import styles from "./prizes.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Literary Prizes, Winners and Where They Were Published | Missa",
  description:
    "Major literary prizes and their winners, from the Caine Prize and the Nigeria Prize for Literature to the Booker and the Pulitzer, and the magazines where prize-winning stories first appeared.",
  path: "/discover/prizes",
});

const REGION_ORDER: PrizeRegion[] = [
  "africa",
  "commonwealth",
  "international",
  "uk-ireland",
  "united-states",
  "canada",
];

const VISIBLE_WINNERS = 8;
const TOP_VENUES = 24;

const GENRE_LABELS: Record<string, string> = {
  fiction: "Fiction",
  poetry: "Poetry",
  nonfiction: "Nonfiction",
  drama: "Drama",
  children: "Children's",
};

/** The matcher form a prize's winners write in, for "find similar" links. */
function matcherForm(prize: LiteraryPrize, winner: PrizeWinner): string | null {
  const genre = (winner.genre ?? "").toLowerCase();
  if (genre === "poetry") return "poetry";
  if (genre === "prose" || genre === "fiction") return "fiction";
  if (prize.genres.length !== 1) return null;
  const [only] = prize.genres;
  return only === "fiction" || only === "poetry" || only === "nonfiction"
    ? only
    : null;
}

/** "The O. Henry Prize Stories (from 2021: ...)" reads as "The O. Henry Prize Stories". */
function shortName(name: string) {
  return name.replace(/\s*\([^)]*\)/g, "");
}

function matcherHref(form: string, writer: string) {
  const params = new URLSearchParams({ form });
  params.append("writer", writer);
  return `/discover/match?${params}`;
}

function sourceHosts(
  prize: LiteraryPrize,
): Array<{ host: string; url: string }> {
  const seen = new Map<string, string>();
  for (const winner of prize.winners) {
    for (const url of winner.sources) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        if (!seen.has(host)) seen.set(host, url);
      } catch {
        // Ignore a malformed source URL rather than failing the page.
      }
    }
  }
  return [...seen.entries()].slice(0, 3).map(([host, url]) => ({ host, url }));
}

function WinnerRows({
  prize,
  winners,
  showVenue,
}: {
  prize: LiteraryPrize;
  winners: PrizeWinner[];
  showVenue: boolean;
}) {
  return (
    <>
      {winners.map((winner) => {
        const form = matcherForm(prize, winner);
        return (
          <TableRow key={`${winner.year}-${winner.writer}`}>
            <TableCell className={`${styles.year} font-mono`}>
              {winner.year}
            </TableCell>
            <TableCell>
              {form ? (
                <Link
                  href={matcherHref(form, winner.writer)}
                  className={styles.writerLink}
                  title={`Find magazines for work like ${winner.writer}'s`}
                >
                  {winner.writer}
                </Link>
              ) : (
                winner.writer
              )}
              {winner.country ? (
                <span className={styles.country}>{winner.country}</span>
              ) : null}
            </TableCell>
            <TableCell className={styles.work}>
              {winner.work ? <cite>{winner.work}</cite> : null}
              {showVenue && winner.firstPublishedIn ? (
                <span className={styles.venueInline}>
                  First published in {winner.firstPublishedIn}
                </span>
              ) : null}
              {winner.translator ? (
                <span className={styles.country}>
                  Translated by {winner.translator}
                </span>
              ) : null}
            </TableCell>
            {showVenue ? (
              <TableCell className={styles.venueCol}>
                {winner.firstPublishedIn ?? ""}
              </TableCell>
            ) : null}
          </TableRow>
        );
      })}
    </>
  );
}

function PrizeSection({ prize }: { prize: LiteraryPrize }) {
  const showVenue = prize.winners.some((winner) => winner.firstPublishedIn);
  const visible = prize.winners.slice(0, VISIBLE_WINNERS);
  const rest = prize.winners.slice(VISIBLE_WINNERS);
  const years = prize.winners.map((winner) => winner.year);
  const head = (
    <TableHeader>
      <TableRow>
        <TableHead className={styles.yearHead}>Year</TableHead>
        <TableHead className={styles.writerHead}>Winner</TableHead>
        <TableHead className={styles.workHead}>Winning work</TableHead>
        {showVenue ? (
          <TableHead className={styles.venueCol}>First published in</TableHead>
        ) : null}
      </TableRow>
    </TableHeader>
  );
  return (
    <article className={styles.prize} aria-labelledby={`prize-${prize.id}`}>
      <header className={styles.prizeHeader}>
        <h3
          id={`prize-${prize.id}`}
          className={`${styles.prizeName} font-heading`}
        >
          {prize.name}
        </h3>
        <p className={styles.prizeMeta}>
          {prize.genres.map((genre) => GENRE_LABELS[genre] ?? genre).join(", ")}
          {" · "}
          {prize.winners.length} winners recorded,{" "}
          <span className="font-mono">
            {Math.min(...years)}–{Math.max(...years)}
          </span>
          {prize.organiserUrl ? (
            <>
              {" · "}
              <a href={prize.organiserUrl} target="_blank" rel="noreferrer">
                Official site
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </>
          ) : null}
        </p>
        {prize.picksFrom ? (
          <p className={styles.picksFrom}>Judges {prize.picksFrom}.</p>
        ) : null}
      </header>
      <div className={styles.tableWrap}>
        <Table>
          {head}
          <TableBody>
            <WinnerRows prize={prize} winners={visible} showVenue={showVenue} />
          </TableBody>
        </Table>
      </div>
      {rest.length ? (
        <PrizeWinnersDisclosure count={rest.length} prizeName={prize.name}>
          <div className={styles.tableWrap}>
            <Table>
              {head}
              <TableBody>
                <WinnerRows
                  prize={prize}
                  winners={rest}
                  showVenue={showVenue}
                />
              </TableBody>
            </Table>
          </div>
        </PrizeWinnersDisclosure>
      ) : null}
      <p className={styles.sources}>
        Sources:{" "}
        {sourceHosts(prize).map((source, index) => (
          <span key={source.host}>
            {index ? ", " : null}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.host}
            </a>
          </span>
        ))}
      </p>
    </article>
  );
}

export default function PrizesPage() {
  const venues = recognisedPublications();
  const topVenues = venues.slice(0, TOP_VENUES);
  const tracedPieces = venues.reduce(
    (sum, venue) => sum + venue.pieces.length,
    0,
  );
  const winnerCount = LITERARY_PRIZES.reduce(
    (sum, prize) => sum + prize.winners.length,
    0,
  );
  const regions = REGION_ORDER.map((region) => ({
    region,
    prizes: LITERARY_PRIZES.filter((prize) => prize.region === region),
  })).filter((group) => group.prizes.length > 0);

  return (
    <PublicSiteShell current="Discover">
      <main className={styles.page} data-density="spacious">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prizes</p>
          <h1 className={`${styles.title} font-heading`}>
            Literary prizes and where their winners were published
          </h1>
          <p className={styles.lede}>
            Who won the major prizes, what each one judges, and the magazines
            where prize-winning stories first appeared. Select a winner to find
            magazines for work like theirs.
          </p>
          <dl className={styles.stats}>
            <div>
              <dt>Prizes</dt>
              <dd className="font-mono">{LITERARY_PRIZES.length}</dd>
            </div>
            <div>
              <dt>Winners recorded</dt>
              <dd className="font-mono">{winnerCount}</dd>
            </div>
            <div>
              <dt>Prize-picked stories traced to a magazine</dt>
              <dd className="font-mono">{tracedPieces}</dd>
            </div>
          </dl>
          <nav aria-label="Jump to" className={styles.jump}>
            <a href="#where-published">Where winners were published</a>
            {regions.map((group) => (
              <a key={group.region} href={`#${group.region}`}>
                {PRIZE_REGION_LABELS[group.region]}
              </a>
            ))}
          </nav>
        </header>

        <section
          id="where-published"
          className={styles.section}
          aria-labelledby="where-published-title"
        >
          <h2 id="where-published-title" className={styles.sectionTitle}>
            Where prize-winning stories first appeared
          </h2>
          <p className={styles.sectionLede}>
            Stories chosen for{" "}
            {PRIZE_COLLECTIONS.map((collection) =>
              shortName(collection.name),
            ).join(", ")}
            , and prize winners whose first publication is recorded, counted by
            the magazine that published them first.
          </p>
          <ol className={styles.venues}>
            {topVenues.map((venue, index) => {
              const bySource = new Map<string, number>();
              for (const piece of venue.pieces) {
                const source = shortName(piece.source);
                bySource.set(source, (bySource.get(source) ?? 0) + 1);
              }
              return (
                <li key={venue.venue} className={styles.venue}>
                  <span
                    className={`${styles.venueRank} font-mono`}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className={styles.venueBody}>
                    <p className={`${styles.venueName} font-heading`}>
                      {venue.venue}
                    </p>
                    <p className={styles.venueBreakdown}>
                      {[...bySource.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([source, count]) => `${source}: ${count}`)
                        .join(" · ")}
                    </p>
                  </div>
                  <data
                    value={venue.pieces.length}
                    className={`${styles.venueCount} font-mono`}
                  >
                    {venue.pieces.length}
                  </data>
                </li>
              );
            })}
          </ol>
          <div className={styles.cta}>
            <p>
              Missa also counts Pushcart Prizes and Best Microfiction picks for
              every magazine in its index when it matches your piece.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/discover/match" />}
            >
              Find magazines for your piece
            </Button>
          </div>
        </section>

        {regions.map((group) => (
          <section
            key={group.region}
            id={group.region}
            className={styles.section}
            aria-labelledby={`${group.region}-title`}
          >
            <h2 id={`${group.region}-title`} className={styles.sectionTitle}>
              {PRIZE_REGION_LABELS[group.region]}
            </h2>
            <div className={styles.prizes}>
              {group.prizes.map((prize) => (
                <PrizeSection key={prize.id} prize={prize} />
              ))}
            </div>
          </section>
        ))}

        <p className={styles.footnote}>
          Every winner here was read from the source linked under its prize,
          checked on 4 October 2026. Spotted a mistake?{" "}
          <Link href="/about">Tell us</Link>.
        </p>
      </main>
    </PublicSiteShell>
  );
}
