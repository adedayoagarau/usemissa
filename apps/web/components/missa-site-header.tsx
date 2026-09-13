"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [logoutError, setLogoutError] = useState(false);
  const router = useRouter();
  const links = session ? signedInLinks : publicLinks;
  const visibleLinks = session?.hasOrganization
    ? [...links, { href: "/workspace", label: "Organization" }]
    : links;

  async function signOut() {
    setLogoutError(false);
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      setLogoutError(true);
      return;
    }
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

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
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" />}
                  className={styles.avatar}
                  aria-label={`Open account menu for ${session.email}`}
                >
                  {session.email.slice(0, 1).toUpperCase()}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={styles.accountMenu}>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <span className={styles.accountName}>{session.email.split("@")[0]}</span>
                      <span>{session.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuItem render={<Link href="/profile" />}>
                      <UserRound aria-hidden="true" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/tracker" />}>
                      <Bookmark aria-hidden="true" /> My applications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut aria-hidden="true" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          {session ? (
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)}>
                Profile
              </Link>
              <Link href="/tracker" onClick={() => setMobileOpen(false)}>
                My applications
              </Link>
              <button
                type="button"
                className={styles.mobileLogout}
                onClick={() => void signOut()}
              >
                Log out
              </button>
              {logoutError ? <p className={styles.mobileError} role="alert">Could not log out. Try again.</p> : null}
            </>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
