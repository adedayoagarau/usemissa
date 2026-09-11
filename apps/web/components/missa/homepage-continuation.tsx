"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { z } from "zod";
import { useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { opportunityBrowseResponseSchema } from "@missa/contracts";
import { Button } from "@/components/ui/button";
import { OpportunityBrowseProjectCard } from "@/components/design-system/opportunity-browse-project-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { MissaWordmark } from "@/components/missa-wordmark";
import { HomepageWorkspace } from "./homepage-workspace";
import { HomepagePortfolio } from "./homepage-portfolio";
import { categorySearch } from "@/lib/homepage-opportunity-categories";
import "@/components/design-system/homepage-continuation-tokens.css";
import "@/components/design-system/homepage-marketing-palette.css";
import styles from "./homepage-continuation.module.css";

type Opportunity = ReturnType<
  typeof opportunityBrowseResponseSchema.parse
>["items"][number];
const profileSchema = z.object({
  name: z.string(),
  slug: z.string(),
  kind: z.string(),
  mediaUrl: z.string().nullish(),
  mediaAlt: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
});
type Profile = z.infer<typeof profileSchema>;
const DIRECTORY_NAMES = [
  "MacDowell",
  "Headlands Center for the Arts",
  "The Paris Review",
  "Yaddo",
  "BOMB Magazine",
  "Poetry Foundation",
];
const PROFILE_KINDS: Record<string, { label: string; path: string }> = {
  residency_center: { label: "Artist residency", path: "/residency/" },
  literary_magazine: { label: "Literary magazine", path: "/journal/" },
  small_press: { label: "Independent press", path: "/press/" },
  grant_foundation: { label: "Foundation", path: "/grant/" },
  visual_arts_organization: { label: "Arts organization", path: "/org/" },
};
const QUESTIONS = [
  {
    q: "Is my portfolio public?",
    a: "Your draft stays private until you publish it.",
  },
  {
    q: "Do I need an account?",
    a: "No. Browse opportunities and read the details without an account. Create one to build a portfolio and save calls.",
  },
  {
    q: "Can I search more than one discipline?",
    a: "Yes. You can select several disciplines and change them at any time.",
  },
  {
    q: "Are all applications free?",
    a: "Some organizers charge a fee. Use the no-fee filter to find opportunities without an application fee.",
  },
  {
    q: "Where do I apply?",
    a: "Open an opportunity and follow the application link. Each organizer sets its own requirements and handles submissions.",
  },
  {
    q: "How do I check whether I’m eligible?",
    a: "Read the eligibility rules and submission guidelines on the opportunity page. Check the organizer’s website for any missing details.",
  },
];
function ActionLink({
  href,
  children,
  inverse = false,
}: {
  href: string;
  children: React.ReactNode;
  inverse?: boolean;
}) {
  return (
    <Button
      nativeButton={false}
      render={<Link href={href} />}
      className={`${styles.action} ${inverse ? styles.inverseAction : ""}`}
    >
      {children}
      <ArrowUpRight aria-hidden="true" size={17} />
    </Button>
  );
}

export function HomepageContinuation({
  signedIn = false,
  layout = "full",
}: {
  signedIn?: boolean;
  layout?: "full" | "focused";
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useInView(sectionRef, { once: true, margin: "300px" });
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(
    null,
  );
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [catalogueError, setCatalogueError] = useState(false);
  const [directoryError, setDirectoryError] = useState(false);
  const [featuredImageFailed, setFeaturedImageFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let alive = true;
    async function json(url: string) {
      const request = new AbortController();
      const abort = () => request.abort();
      controller.signal.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(abort, 25000);
      try {
        if (controller.signal.aborted) throw new Error("Cancelled");
        const response = await fetch(url, { signal: request.signal });
        if (!response.ok) throw new Error("Unavailable");
        return await response.json();
      } finally {
        clearTimeout(timeout);
        controller.signal.removeEventListener("abort", abort);
      }
    }
    const catalogue = json("/api/opportunities?openNow=true&limit=12")
      .then((data) => {
        const items = opportunityBrowseResponseSchema.parse(data).items;
        const actionable = items.filter(
          (item) => item.submissionAvailable && item.type !== "other",
        );
        const candidates = actionable.length ? actionable : items;
        const types = new Set<string>();
        const varied = candidates.filter((item) => {
          if (types.has(item.type)) return false;
          types.add(item.type);
          return true;
        });
        if (alive) {
          setOpportunities(
            [
              ...varied,
              ...candidates.filter((item) => !varied.includes(item)),
            ].slice(0, 3),
          );
          setCatalogueError(false);
        }
      })
      .catch(() => {
        if (alive) setCatalogueError(true);
      });
    const directory = catalogue
      .then(() =>
        Promise.allSettled(
          DIRECTORY_NAMES.map(async (name) => {
            const data = await json(
              `/api/journals?limit=48&q=${encodeURIComponent(name)}`,
            );
            const rows = z
              .object({ items: z.array(profileSchema) })
              .parse(data).items;
            return rows.find(
              (profile) => profile.name.toLowerCase() === name.toLowerCase(),
            );
          }),
        ),
      )
      .then((results) => {
        const rows = results.flatMap((result) =>
          result.status === "fulfilled" && result.value ? [result.value] : [],
        );
        if (alive) {
          setProfiles(rows);
          setDirectoryError(rows.length === 0);
        }
      });
    void Promise.allSettled([catalogue, directory]);
    return () => {
      alive = false;
      controller.abort();
    };
  }, [attempt, visible]);
  const featuredProfile = profiles?.find(
    (profile) => profile.slug === "headlands-center-for-the-arts",
  );
  const remainingProfiles = profiles?.filter(
    (profile) => profile !== featuredProfile,
  );
  const retry = () => {
    setOpportunities(null);
    setProfiles(null);
    setCatalogueError(false);
    setDirectoryError(false);
    setAttempt((value) => value + 1);
  };

  return (
    <div
      ref={sectionRef}
      className={`missa-homepage-continuation ${styles.root}`}
    >
      <section
        className={styles.how}
        id="how-missa-works"
        aria-labelledby="how-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="how-heading">Current calls</h2>
          </div>
          <Link className={styles.textLink} href="/opportunities">
            Browse all calls <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {catalogueError ? (
          <div className={styles.resourceState} role="status">
            <h3>We couldn’t load the opportunities.</h3>
            <p>Try again, or open the opportunities page.</p>
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
            <Link href="/opportunities">
              Browse opportunities <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : !opportunities ? (
          <div
            className={styles.opportunityGrid}
            role="status"
            aria-label="Loading opportunities"
            aria-busy="true"
          >
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className={styles.opportunitySkeleton} />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className={styles.resourceState}>
            <h3>No open opportunities to show.</h3>
            <ActionLink href="/opportunities">Browse opportunities</ActionLink>
          </div>
        ) : (
          <div className={styles.opportunityGrid}>
            {opportunities.map((item) => (
              <OpportunityBrowseProjectCard
                key={item.id}
                item={item}
                signedIn={signedIn}
              />
            ))}
          </div>
        )}
      </section>

      <div className={styles.workspaceBand}>
        {layout === "focused" ? (
          <HomepagePortfolio />
        ) : (
          <HomepageWorkspace
            opportunities={opportunities}
            failed={catalogueError}
            onRetry={retry}
          />
        )}
      </div>

      <section
        className={styles.directory}
        id="places-to-know"
        aria-labelledby="places-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="places-heading">The organizations behind the calls</h2>
          </div>
          <Link className={styles.textLink} href="/directory">
            Browse organizations <ArrowUpRight size={18} />
          </Link>
        </div>
        {directoryError ? (
          <p className={styles.directoryFallback}>
            We couldn’t load these organizations. You can still browse the
            directory.
          </p>
        ) : !profiles ? (
          <div className={styles.organizationGrid} aria-busy="true">
            {DIRECTORY_NAMES.map((name) => (
              <Skeleton key={name} className={styles.organizationSkeleton} />
            ))}
          </div>
        ) : (
          <div className={styles.organizationGrid}>
            {featuredProfile && (
              <article className={styles.featuredOrganization}>
                <Link
                  href={`/org/${featuredProfile.slug}`}
                  className={styles.featuredOrganizationLink}
                >
                  <div className={styles.organizationPhoto}>
                    {featuredImageFailed ? (
                      <span
                        className={`${styles.organizationPhotoFallback} font-heading`}
                      >
                        Headlands Center for the Arts
                      </span>
                    ) : (
                      <Image
                        unoptimized
                        fill
                        sizes="(max-width: 760px) 100vw, 50vw"
                        src="https://www.headlands.org/wp-content/uploads/2022/02/HCA_Campus_AndriaLo_1-1024x682.jpg"
                        alt="Building 945 at Headlands Center for the Arts"
                        onError={() => setFeaturedImageFailed(true)}
                      />
                    )}
                  </div>
                  <div className={styles.featuredOrganizationCopy}>
                    <span className={styles.organizationKind}>
                      {PROFILE_KINDS[featuredProfile.kind]?.label ||
                        "Organization"}
                      {featuredProfile.city && ` · ${featuredProfile.city}`}
                    </span>
                    <h3 className="font-heading">{featuredProfile.name}</h3>
                    <span className={styles.organizationVisit}>
                      Explore Headlands{" "}
                      <ArrowUpRight size={20} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
                <a
                  className={styles.photoCredit}
                  href="https://www.headlands.org/about/"
                >
                  Photo: Andria Lo / Headlands
                </a>
              </article>
            )}
            <div className={styles.organizationList}>
              {remainingProfiles?.map((profile) => {
                const kind = PROFILE_KINDS[profile.kind];
                return (
                  <Link
                    key={profile.slug}
                    href={`${kind?.path || "/org/"}${encodeURIComponent(profile.slug)}`}
                    className={styles.organization}
                  >
                    <Avatar className={styles.organizationLogo}>
                      {profile.mediaUrl && (
                        <AvatarImage
                          src={profile.mediaUrl}
                          alt=""
                          className={styles.organizationLogoImage}
                        />
                      )}
                      <AvatarFallback
                        className={`${styles.organizationLogoFallback} font-heading`}
                      >
                        {profile.name.replace(/^The /, "").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className={styles.organizationKind}>
                        {kind?.label || "Organization"}
                      </span>
                      <h3 className="font-heading">{profile.name}</h3>
                    </div>
                    <ArrowUpRight
                      className={styles.organizationArrow}
                      size={20}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className={styles.questionsBand}>
        <section
          className={styles.questions}
          id="homepage-questions"
          aria-labelledby="questions-heading"
        >
          <div>
            <h2 id="questions-heading">Questions about Missa</h2>
            <a className={styles.textLink} href="mailto:hello@usemissa.com">
              Contact us <ArrowUpRight size={17} />
            </a>
          </div>
          <Accordion className={styles.faq}>
            {QUESTIONS.map(({ q, a }, index) => (
              <AccordionItem
                key={q}
                value={`question-${index}`}
                className={styles.faqItem}
              >
                <AccordionTrigger className={styles.faqTrigger}>
                  {q}
                </AccordionTrigger>
                <AccordionContent className={styles.faqContent}>
                  <p>{a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>

      <section
        className={styles.invitation}
        aria-labelledby="invitation-heading"
      >
        <h2 id="invitation-heading">Save calls and share your work.</h2>
        <div className={styles.invitationActions}>
          <ActionLink
            href={signedIn ? "/profile/portfolio" : "/signup"}
            inverse
          >
            {signedIn ? "Open your portfolio" : "Create an account"}
          </ActionLink>
          {layout === "full" && (
            <Link href="/opportunities">
              Browse opportunities <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export function HomepageFooter() {
  return (
    <div className={`missa-homepage-continuation ${styles.root}`}>
      <footer className={styles.footerScene}>
        <div className={styles.footer}>
          <div className={styles.footerMain}>
            <div>
              <MissaWordmark size="marketing" />
            </div>
            <nav aria-label="Homepage footer navigation">
              <div>
                <span>Calls</span>
                <Link href="/opportunities">Opportunities</Link>
                <Link href={`/opportunities?${categorySearch(["residency"])}`}>
                  Residencies
                </Link>
                <Link href={`/opportunities?${categorySearch(["grant"])}`}>
                  Grants
                </Link>
                <Link
                  href={`/opportunities?${categorySearch(["magazine", "pitch"])}`}
                >
                  Publications
                </Link>
              </div>
              <div>
                <span>Explore</span>
                <Link
                  href={`/opportunities?${categorySearch(["award", "contest"])}`}
                >
                  Prizes
                </Link>
                <Link href={`/opportunities?${categorySearch(["exhibition"])}`}>
                  Exhibitions
                </Link>
                <Link href={`/opportunities?${categorySearch(["festival"])}`}>
                  Festivals
                </Link>
                <Link href="/directory">Organizations</Link>
              </div>
              <div>
                <span>Your work</span>
                <Link href="/profile/portfolio">Portfolio</Link>
              </div>
              <div>
                <span>Tools &amp; guides</span>
                <Link href="/rankings/magazines">Magazine rankings</Link>
                <Link href="/methodology">How Missa works</Link>
                <Link href="/about">About us</Link>
                <a href="mailto:hello@usemissa.com">Get in touch</a>
              </div>
              <div>
                <span>Account</span>
                <Link href="/login">Log in</Link>
                <Link href="/signup">Create an account</Link>
              </div>
            </nav>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Missa</span>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
        <div className={styles.footerPainting}>
          <Image
            src="/media/home/generated/missa-coastal-village.webp"
            alt="Watercolour painting of a coastal village with artists’ studios, green hills, blue water and small boats"
            fill
            sizes="100vw"
          />
        </div>
      </footer>
    </div>
  );
}
