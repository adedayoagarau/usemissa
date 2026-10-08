"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  Bell,
  Building2,
  CalendarDays,
  ChevronsUpDown,
  CreditCard,
  House,
  CalendarRange,
  Inbox,
  ListOrdered,
  LogOut,
  Menu,
  PanelLeftClose,
  PenLine,
  PanelLeftOpen,
  Target,
  Search,
  Shield,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { MissaWordmark } from "@/components/missa-wordmark";
import { HueTile } from "@/components/missa/hue-tile";
import { PersonAvatar, type PersonHue } from "@/components/missa/person-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { rememberSignedIn } from "@/lib/signedInHint";
import { cn } from "@/lib/utils";
import styles from "./creator-shell.module.css";

/** Each destination keeps one hue, so people find it by colour as well as name. */
type Destination = {
  href: string;
  label: string;
  icon: LucideIcon;
  hue: PersonHue;
  detail?: string;
};
type DestinationGroup = { label?: string; items: Destination[] };

const home: Destination = {
  href: "/home",
  label: "Home",
  icon: House,
  hue: "teal",
};
const inbox: Destination = {
  href: "/inbox",
  label: "Inbox",
  icon: Inbox,
  hue: "blue",
};
const opportunities: Destination = {
  href: "/opportunities",
  label: "Opportunities",
  icon: Search,
  hue: "orange",
};
const goals: Destination = {
  href: "/goals",
  label: "Goals",
  icon: Target,
  hue: "red",
};
const calendar: Destination = {
  href: "/calendar",
  label: "Calendar",
  icon: CalendarDays,
  hue: "amber",
};
const library: Destination = {
  href: "/library",
  label: "Library",
  icon: Archive,
  hue: "yellow",
};
const profile: Destination = {
  href: "/profile",
  label: "Profile",
  icon: UserRound,
  hue: "magenta",
};

const accountGroups: DestinationGroup[] = [
  { items: [home, inbox] },
  {
    label: "Find",
    items: [
      opportunities,
      { href: "/following", label: "Following", icon: Bell, hue: "pink" },
    ],
  },
  {
    label: "Plan and track",
    items: [
      { href: "/tracker", label: "Tracker", icon: BookOpen, hue: "indigo" },
      goals,
      calendar,
      { href: "/season", label: "Season", icon: CalendarRange, hue: "lime" },
    ],
  },
  {
    label: "Your work",
    items: [
      { href: "/doc", label: "Write", icon: PenLine, hue: "purple" },
      library,
      profile,
    ],
  },
];

const previewGroups: DestinationGroup[] = [
  { items: [inbox] },
  {
    label: "Find",
    items: [
      opportunities,
      { href: "/directory", label: "Directory", icon: Building2, hue: "green" },
      {
        href: "/rankings/magazines",
        label: "Rankings",
        icon: ListOrdered,
        hue: "lime",
      },
    ],
  },
  {
    label: "Plan and track",
    items: [
      {
        href: "/design-system/applications-v2",
        label: "My applications",
        icon: BookOpen,
        hue: "indigo",
      },
      { ...goals, href: "/design-system/goals" },
      calendar,
    ],
  },
  { label: "Your work", items: [library, profile] },
];

export type CreatorOrganization = { id: string; name: string };

export function CreatorShell({
  children,
  email,
  organizations = [],
  isAdmin = false,
  applicationsPreview = false,
}: {
  children: React.ReactNode;
  email: string;
  organizations?: CreatorOrganization[];
  isAdmin?: boolean;
  applicationsPreview?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("missa-creator-nav") === "collapsed",
  );
  const [logoutError, setLogoutError] = useState(false);

  // Only signed-in people reach this shell. Recording it lets public pages,
  // which are served from the CDN, show their account in the site header.
  useEffect(() => rememberSignedIn(true), []);

  const groups = applicationsPreview ? previewGroups : accountGroups;
  const elsewhere: Destination[] = [
    ...(organizations.length
      ? [
          {
            href:
              organizations.length === 1
                ? `/organization/${organizations[0].id}/overview`
                : "/organization",
            label: "Organization",
            icon: Building2,
            hue: "green" as const,
            detail:
              organizations.length === 1
                ? organizations[0].name
                : `${organizations.length} organizations`,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Platform Admin",
            icon: Shield,
            hue: "indigo" as const,
            detail: "Run Missa",
          },
        ]
      : []),
  ];

  function toggleRail() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(
        "missa-creator-nav",
        next ? "collapsed" : "expanded",
      );
      return next;
    });
  }

  async function signOut() {
    setLogoutError(false);
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      setLogoutError(true);
      return;
    }
    rememberSignedIn(false);
    router.push("/login");
    router.refresh();
  }

  function isCurrent(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  /** One destination: a nav button with its colour tile, named in a tooltip when the rail is narrow. */
  function destinationLink(item: Destination, inRail: boolean) {
    const Icon = item.icon;
    const current = isCurrent(item.href);
    const link = (
      <Link
        href={item.href}
        aria-label={item.detail ? `${item.label}, ${item.detail}` : item.label}
        aria-current={current ? "page" : undefined}
        onClick={() => setOpen(false)}
        className={cn(buttonVariants({ variant: "nav" }), styles.destination)}
      >
        <HueTile hue={item.hue} tone={current ? "solid" : "soft"} size="sm">
          <Icon
            className="size-3.5 text-current"
            strokeWidth={2}
            aria-hidden="true"
          />
        </HueTile>
        <span className={styles.destinationText}>
          <span className="truncate">{item.label}</span>
          {item.detail ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {item.detail}
            </span>
          ) : null}
        </span>
      </Link>
    );
    if (!inRail || !collapsed) return <li key={item.href}>{link}</li>;
    return (
      <li key={item.href}>
        <Tooltip>
          <TooltipTrigger render={link} />
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  function navigation(inRail: boolean) {
    return (
      <nav aria-label="Missa navigation" className={styles.navigation}>
        {groups.map((group, index) => (
          <div key={group.label ?? index} className={styles.group}>
            {group.label ? (
              <p className={styles.groupLabel}>{group.label}</p>
            ) : null}
            <ul>{group.items.map((item) => destinationLink(item, inRail))}</ul>
          </div>
        ))}
        {elsewhere.length ? (
          <div className={styles.group}>
            <p className={styles.groupLabel}>Switch to</p>
            <ul>{elsewhere.map((item) => destinationLink(item, inRail))}</ul>
          </div>
        ) : null}
      </nav>
    );
  }

  const name = applicationsPreview ? "Design preview" : email.split("@")[0];
  const account = (
    <div className={styles.account}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="account"
              className={styles.accountTrigger}
            />
          }
          aria-label={`Open account menu for ${name}`}
        >
          <PersonAvatar name={name} identity={email} />
          <span className={styles.accountText}>
            <span className="truncate text-sm font-semibold text-foreground">
              {name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {applicationsPreview ? "Sample account navigation" : email}
            </span>
          </span>
          <ChevronsUpDown
            className={styles.accountChevron}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="grid">
              <span className="truncate text-sm text-foreground">{name}</span>
              <span className="truncate font-normal">
                {applicationsPreview ? "Sample account navigation" : email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/profile" />}>
              <UserRound aria-hidden="true" /> Profile
            </DropdownMenuItem>
            {applicationsPreview ? null : (
              <DropdownMenuItem render={<Link href="/plan" />}>
                <CreditCard aria-hidden="true" /> Plan
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={applicationsPreview}
            onClick={() => void signOut()}
          >
            <LogOut aria-hidden="true" />
            {applicationsPreview ? "Preview only" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {logoutError ? (
        <p role="alert" className="px-2 text-xs text-destructive">
          Couldn’t log out. Try again.
        </p>
      ) : null}
    </div>
  );

  return (
    <div className={styles.shell} data-rail-collapsed={collapsed || undefined}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <aside className={styles.rail}>
        <div className={styles.railHeader}>
          <MissaWordmark
            href="/opportunities"
            size="app"
            className={styles.wordmark}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleRail}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </Button>
        </div>
        {navigation(true)}
        {account}
      </aside>
      <header className={styles.mobileHeader}>
        <MissaWordmark href="/opportunities" size="app" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu aria-hidden="true" />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className={styles.drawer}>
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Go to any part of Missa.</SheetDescription>
          </SheetHeader>
          <div className={styles.drawerHeader}>
            <MissaWordmark href="/opportunities" size="app" />
          </div>
          {navigation(false)}
          {account}
        </SheetContent>
      </Sheet>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
