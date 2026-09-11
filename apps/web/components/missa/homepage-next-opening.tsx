"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { useReducedMotion } from "framer-motion";
import { opportunityBrowseResponseSchema } from "@missa/contracts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  HOMEPAGE_CATEGORIES,
  categorySearch,
} from "@/lib/homepage-opportunity-categories";
import "@/components/design-system/homepage-carousel-tokens.css";
import "@/components/design-system/homepage-marketing-palette.css";
import styles from "./homepage-next-opening.module.css";

type HomepageCounts = {
  open: number;
  residencies: number;
  grants: number;
  organizations: number;
};

export function HomepageNextOpening({
  layout = "carousel",
}: {
  layout?: "carousel" | "compact";
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(2);
  const [counts, setCounts] = useState<HomepageCounts | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reduced = useReducedMotion();
  const wheelPlugins = useMemo(
    () => [WheelGesturesPlugin({ forceWheelAxis: "x" })],
    [],
  );

  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let alive = true;
    Promise.all([
      ...[[], ["residency"], ["grant"]].map(async (types) => {
        const response = await fetch(
          `/api/opportunities?${categorySearch(types)}&limit=1`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Catalogue unavailable");
        return opportunityBrowseResponseSchema.parse(await response.json())
          .total;
      }),
      fetch("/api/journals?limit=1", { signal: controller.signal }).then(
        async (response) => {
          if (!response.ok) throw new Error("Directory unavailable");
          return z
            .object({ total: z.number().int().nonnegative() })
            .parse(await response.json()).total;
        },
      ),
    ])
      .then(([open, residencies, grants, organizations]) => {
        if (alive) {
          setCounts({ open, residencies, grants, organizations });
          setStatsError(false);
        }
      })
      .catch(() => {
        if (alive) setStatsError(true);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const select = (index: number) => api?.scrollTo(index, Boolean(reduced));
  if (layout === "compact") {
    return (
      <section
        className={`missa-opportunity-carousel ${styles.compact}`}
        id="next-opening"
        aria-labelledby="compact-discovery-heading"
      >
        <div className={styles.compactInner}>
          <div className={styles.compactHeading}>
            <div>
              <h2 id="compact-discovery-heading" className="font-heading">
                Your next opportunity is one click away.
              </h2>
            </div>
            <div
              className={styles.compactTotal}
              role="status"
              aria-busy={!counts && !statsError}
            >
              {counts ? (
                <Link href={`/opportunities?${categorySearch([])}`}>
                  <strong className="font-mono">
                    {new Intl.NumberFormat("en").format(counts.open)}
                  </strong>
                  <span>
                    Open opportunities <span aria-hidden="true">↗</span>
                  </span>
                </Link>
              ) : statsError ? (
                <>
                  <p>Totals are unavailable.</p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStatsError(false);
                      setAttempt((value) => value + 1);
                    }}
                  >
                    Try again
                  </Button>
                </>
              ) : (
                <>
                  <span className="sr-only">Loading opportunity total…</span>
                  <Skeleton className={styles.compactSkeleton} />
                </>
              )}
            </div>
          </div>
          <nav
            className={styles.categoryLinks}
            aria-label="Explore opportunity categories"
          >
            {HOMEPAGE_CATEGORIES.map((category) => (
              <Link
                key={category.title}
                href={`/opportunities?${categorySearch(category.types)}`}
              >
                {category.title}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>
    );
  }
  return (
    <div className="missa-opportunity-carousel">
      <section
        id="next-opening"
        className={styles.context}
        aria-labelledby="scattered-heading"
      >
        <div className={styles.statement}>
          <h2 id="scattered-heading">
            Opportunities are scattered
            <br /> across the web.
          </h2>
          <div className={styles.introduction}>
            <p className={styles.answer}>Missa brings them together.</p>
            <p>
              Browse residencies, grants, publications and prizes in one place.
            </p>
          </div>
        </div>
        {counts ? (
          <div className={styles.stats}>
            {[
              {
                label: "Open opportunities",
                value: counts.open,
                copy: "Calls you can apply to now.",
                href: `/opportunities?${categorySearch([])}`,
              },
              {
                label: "Residencies",
                value: counts.residencies,
                copy: "Time and space to make work.",
                href: `/opportunities?${categorySearch(["residency"])}`,
              },
              {
                label: "Grants",
                value: counts.grants,
                copy: "Funding for your next project.",
                href: `/opportunities?${categorySearch(["grant"])}`,
              },
              {
                label: "Organizations",
                value: counts.organizations,
                copy: "The people and places behind the calls.",
                href: "/directory",
              },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className={styles.stat}>
                <span className={styles.statLabel}>
                  {stat.label}{" "}
                  <span className={styles.statArrow} aria-hidden="true">
                    ↗
                  </span>
                </span>
                <strong>
                  {new Intl.NumberFormat("en").format(stat.value)}
                  <span className={styles.plus}>+</span>
                </strong>
                <p>{stat.copy}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className={styles.statsStatus}
            role="status"
            aria-busy={!statsError}
          >
            {statsError ? (
              <>
                <p>We couldn’t load the totals.</p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatsError(false);
                    setAttempt((x) => x + 1);
                  }}
                >
                  Try again
                </Button>
              </>
            ) : (
              <>
                <span className="sr-only">Loading opportunity totals…</span>
                <div className={styles.stats} aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <div className={styles.stat} key={index}>
                      <Skeleton className={styles.skeletonLabel} />
                      <Skeleton className={styles.skeletonNumber} />
                      <Skeleton className={styles.skeletonCopy} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>
      <section
        id="opportunity-categories"
        className={styles.discovery}
        aria-label="Explore opportunity categories"
      >
        <h2 className="sr-only">Find your next opportunity</h2>
        <Carousel
          setApi={setApi}
          plugins={wheelPlugins}
          opts={{
            align: "center",
            loop: true,
            containScroll: false,
            startIndex: 2,
            duration: reduced ? 0 : 30,
          }}
          className={styles.carousel}
          aria-label="Opportunity categories"
        >
          <CarouselContent className={styles.track}>
            {HOMEPAGE_CATEGORIES.map((category, index) => {
              const active = selected === index;
              return (
                <CarouselItem
                  key={category.title}
                  className={styles.slide}
                  style={{
                    zIndex:
                      10 -
                      Math.min(
                        Math.abs(selected - index),
                        HOMEPAGE_CATEGORIES.length - Math.abs(selected - index),
                      ),
                  }}
                  aria-label={`${index + 1} of ${HOMEPAGE_CATEGORIES.length}: ${category.title}`}
                >
                  <Card className={styles.card} data-active={active}>
                    <div className={styles.photograph}>
                      <Image
                        src={`/media/home/generated/${category.title.toLowerCase()}.webp`}
                        alt=""
                        fill
                        sizes="(max-width: 600px) 300px, 400px"
                        draggable={false}
                      />
                    </div>
                    {!active && (
                      <Button
                        variant="ghost"
                        className={styles.selectCard}
                        aria-label={`Show ${category.title}`}
                        disabled={!api}
                        onClick={() => select(index)}
                      />
                    )}
                    <div
                      className={styles.copy}
                      aria-hidden={!active}
                      inert={!active ? true : undefined}
                    >
                      <CardHeader className={styles.cardHeader}>
                        <CardTitle className={`font-sans ${styles.cardTitle}`}>
                          <h3>{category.title}</h3>
                        </CardTitle>
                        <CardDescription className={styles.cardDescription}>
                          {category.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className={styles.cardFooter}>
                        <Button
                          nativeButton={false}
                          render={
                            <Link
                              href={`/opportunities?${categorySearch(category.types)}`}
                              aria-label={`Browse ${category.title.toLowerCase()}`}
                              tabIndex={active ? 0 : -1}
                            />
                          }
                          variant="default"
                          className={styles.learn}
                        >
                          Browse {category.title.toLowerCase()}{" "}
                          <span aria-hidden="true">↗</span>
                        </Button>
                      </CardFooter>
                    </div>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className={styles.controls}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous category"
              disabled={!api}
              onClick={() => api?.scrollPrev(Boolean(reduced))}
            >
              ←
            </Button>
            <div
              className={styles.dots}
              aria-label="Choose an opportunity category"
            >
              {HOMEPAGE_CATEGORIES.map((category, index) => (
                <Button
                  key={category.title}
                  variant="ghost"
                  size="icon"
                  aria-label={`Go to ${category.title}`}
                  aria-pressed={selected === index}
                  disabled={!api}
                  className={styles.dotButton}
                  onClick={() => select(index)}
                >
                  <span data-active={selected === index} />
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next category"
              disabled={!api}
              onClick={() => api?.scrollNext(Boolean(reduced))}
            >
              →
            </Button>
          </div>
          <p className="sr-only" role="status">
            {HOMEPAGE_CATEGORIES[selected].title}, {selected + 1} of{" "}
            {HOMEPAGE_CATEGORIES.length}
          </p>
        </Carousel>
      </section>
    </div>
  );
}
