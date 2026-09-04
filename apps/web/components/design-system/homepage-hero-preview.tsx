"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MissaWordmark } from "@/components/missa-wordmark";
import { Button } from "@/components/ui/button";
import styles from "./homepage-hero-preview.module.css";

const DESKTOP_PLATE = "/design-system/homepage-hero/knit-h1.jpg";
const MOBILE_PLATE = "/design-system/homepage-hero/knit-h1-mobile.jpg";

const navLinks = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/directory", label: "Directory" },
  { href: "/residencies", label: "Residencies" },
  { href: "/for-organizations", label: "For organizations" },
] as const;

export function HomepageHeroPreview() {
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
      if (!menuRef.current?.contains(event.target as Node)) {
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
    <section className={styles.hero} aria-labelledby="homepage-hero-heading">
      <a className={styles.skipLink} href="#homepage-hero-heading">
        Skip to story
      </a>

      <div className={styles.stage} aria-hidden="true">
        <Image
          src={MOBILE_PLATE}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`${styles.plate} ${styles.plateMobile}`}
        />
        <Image
          src={DESKTOP_PLATE}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`${styles.plate} ${styles.plateDesktop}`}
        />
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
                {navLinks.map((link) => (
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
              </nav>
            </div>
          </div>
        </div>
      </div>

      <header className={styles.bar}>
        <MissaWordmark href="/" size="app" inverse className={styles.wordmark} />
        <nav className={styles.nav} aria-label="Primary">
          {navLinks.map((link) => (
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
            For writers, visual artists, performers, filmmakers, musicians, and
            designers.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/opportunities" />}
            variant="ghost"
            className={styles.explore}
          >
            <span className={styles.exploreMark} aria-hidden="true">
              <ArrowUpRight className={styles.exploreArrow} />
            </span>
            Explore
          </Button>
        </div>
      </div>
    </section>
  );
}
