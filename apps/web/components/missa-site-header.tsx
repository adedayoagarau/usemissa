"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./missa-site-header.module.css";

export type HeaderSession = {
  email: string;
  hasOrganization: boolean;
} | null;

const signedInLinks = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/directory", label: "Directory" },
  { href: "/rankings/magazines", label: "Rankings" },
  { href: "/tracker", label: "Tracker" },
  { href: "/library", label: "Library" },
] as const;

const publicLinks = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/directory", label: "Directory" },
  { href: "/rankings/magazines", label: "Rankings" },
  { href: "/about", label: "About" },
] as const;

export function MissaSiteHeader({
  session,
  current = "Opportunities",
}: {
  session: HeaderSession;
  current?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = session ? signedInLinks : publicLinks;
  const visibleLinks = session?.hasOrganization
    ? [...links, { href: "/workspace", label: "Organization" }]
    : links;

  return (
    <header className={styles.header}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <div className={styles.inner}>
        <MissaWordmark href="/" size="app" className={styles.brandLink} />
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.label === (current === "Magazine rankings" ? "Rankings" : current) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          {session ? (
            <>
              <Button
                nativeButton={false}
                render={<Link href="/opportunities" />}
                variant="ghost"
                size="icon"
                aria-label="Search Missa"
              >
                <Search aria-hidden="true" />
              </Button>
              <Link
                href="/profile"
                className={styles.avatar}
                aria-label="Open Profile"
              >
                {session.email.slice(0, 1).toUpperCase()}
              </Link>
            </>
          ) : (
            <div className={styles.authActions}>
              <Link href="/login?next=%2Fopportunities">Log in</Link>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={styles.mobileButton}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      {mobileOpen ? (
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.label === (current === "Magazine rankings" ? "Rankings" : current) ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!session ? (
            <>
              <Link
                href="/login?next=%2Fopportunities"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
            </>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
