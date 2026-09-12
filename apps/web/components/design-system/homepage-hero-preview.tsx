"use client";

import { ArrowUpRight } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MissaWordmark } from "@/components/missa-wordmark";
import { HOMEPAGE_NAV_LINKS } from "@/lib/homepage-navigation";
import styles from "./homepage-hero-preview.module.css";
import "./homepage-marketing-palette.css";

const DESKTOP_PLATE = "/design-system/homepage-hero/knit-h1.jpg";
const MOBILE_PLATE = "/design-system/homepage-hero/knit-h1-mobile.jpg";

export function HomepageHeroPreview({
  exploreHref = "/opportunities",
}: {
  exploreHref?: string;
}) {
  const mobileImage = getImageProps({
    src: MOBILE_PLATE,
    alt: "",
    width: 652,
    height: 1024,
    sizes: "100vw",
    fetchPriority: "high",
  }).props;
  const desktopImage = getImageProps({
    src: DESKTOP_PLATE,
    alt: "",
    width: 1024,
    height: 573,
    sizes: "100vw",
    fetchPriority: "high",
  }).props;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <section
      className={`missa-homepage-hero ${styles.hero}`}
      aria-labelledby="homepage-hero-heading"
    >
      <a className={styles.skipLink} href="#homepage-hero-heading">
        Skip to content
      </a>

      <div className={styles.stage} aria-hidden="true">
        <picture>
          <source
            media="(min-width: 1024px)"
            srcSet={desktopImage.srcSet}
            sizes={desktopImage.sizes}
          />
          <img {...mobileImage} alt="" className={styles.plate} />
        </picture>
      </div>

      <div className={styles.floatNav}>
        <MissaWordmark
          href="/"
          size="app"
          inverse
          className={styles.floatWordmark}
        />
        <div className={styles.floatMenu} ref={menuRef}>
          <div
            className={styles.morphMenu}
            data-open={menuOpen ? "true" : "false"}
          >
            <button
              type="button"
              className={styles.morphTrigger}
              aria-expanded={menuOpen}
              aria-controls="homepage-hero-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={styles.morphIndicator} aria-hidden="true" />
            </button>
            <div className={styles.morphPanel}>
              <nav
                id="homepage-hero-menu"
                className={styles.morphLinks}
                aria-label="Primary"
                aria-hidden={!menuOpen}
                inert={menuOpen ? undefined : true}
              >
                {HOMEPAGE_NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setMenuOpen(false)}
                >
                  Create account
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <header className={styles.bar}>
        <MissaWordmark
          href="/"
          size="app"
          inverse
          className={styles.wordmark}
        />
        <nav className={styles.nav} aria-label="Primary">
          {HOMEPAGE_NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.barActions}>
          <Link href="/login" className={styles.login}>
            Log in
          </Link>
          <Link href="/signup" className={styles.signup}>
            Create account
          </Link>
        </div>
      </header>

      <div className={styles.copy}>
        <div className={styles.copyInner}>
          <h1 id="homepage-hero-heading">
            Opportunities and grants for every creator
          </h1>
          <p className={styles.lede}>
            Find open calls, grants, residencies and places to share your work.
          </p>
          <Link href={exploreHref} className={styles.explore}>
            <span className={styles.exploreMark} aria-hidden="true">
              <ArrowUpRight className={styles.exploreArrow} />
            </span>
            Browse opportunities
          </Link>
        </div>
      </div>
    </section>
  );
}
