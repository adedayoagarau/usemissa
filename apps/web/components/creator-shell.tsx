"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, BookOpen, Building2, Inbox, Menu, Search, Shield, UserRound } from "lucide-react";
import { MissaWordmark } from "@/components/missa-wordmark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import styles from "./creator-shell.module.css";

const primary = [
  { href: "/opportunities", label: "Opportunities", icon: Search },
  { href: "/tracker", label: "Tracker", icon: BookOpen },
  { href: "/library", label: "Library", icon: Archive },
] as const;

export type CreatorOrganization = { id: string; name: string };

export function CreatorShell({ children, email, organizations = [], isAdmin = false }: { children: React.ReactNode; email: string; organizations?: CreatorOrganization[]; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const links = [
    ...primary,
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/profile", label: "Profile", icon: UserRound },
  ];

  const navigation = (
    <>
      <nav aria-label="Creator navigation" className={styles.navigation}>
        <p>Creator tools</p>
        {links.map(({ href, label, icon: Icon }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}><Icon aria-hidden="true" /><span>{label}</span></Link>;
        })}
      </nav>
      {organizations.length ? <Link href={organizations.length === 1 ? `/organization/${organizations[0].id}/overview` : "/organization"} className={styles.organization} onClick={() => setOpen(false)}><Building2 aria-hidden="true" /><span><b>Organization</b><small>{organizations.length === 1 ? organizations[0].name : `${organizations.length} organizations`}</small></span></Link> : null}
      {isAdmin ? <Link href="/admin" className={styles.organization} onClick={() => setOpen(false)}><Shield aria-hidden="true" /><span><b>Platform Admin</b><small>Operate Missa</small></span></Link> : null}
    </>
  );

  async function signOut() {
    setLogoutError(false);
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) { setLogoutError(true); return; }
    router.push("/login");
    router.refresh();
  }

  return <div className={styles.shell}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <aside className={styles.rail}>
      <MissaWordmark href="/opportunities" size="app" className={styles.wordmark} />
      {navigation}
      <div className={styles.account}><span aria-hidden="true">{email[0]?.toUpperCase()}</span><div><b>{email.split("@")[0]}</b><small>{email}</small></div><button type="button" onClick={() => void signOut()}>Log out</button>{logoutError ? <p role="alert">Could not log out. Try again.</p> : null}</div>
    </aside>
    <header className={styles.mobileHeader}>
      <MissaWordmark href="/opportunities" size="app" />
      <Button type="button" variant="outline" size="icon" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(true)}><Menu aria-hidden="true" /></Button>
    </header>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className={styles.drawer}>
        <SheetHeader><SheetTitle>Profile</SheetTitle><SheetDescription>Navigate your creator tools.</SheetDescription></SheetHeader>
        {navigation}
        <button className={styles.mobileLogout} type="button" onClick={() => void signOut()}>Log out</button>
      </SheetContent>
    </Sheet>
    <div className={styles.content}>{children}</div>
  </div>;
}
