'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Menu, X } from 'lucide-react';

/** Shared top nav for both the Passport and Workspace route groups --
 * labels match docs/missa-naming-decisions.md exactly. Do not reorganize
 * or rename these -- see docs/missa-naming-decisions.md. */
const NAV_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/my-submissions', label: 'Submissions' },
  { href: '/library', label: 'Library' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/messages', label: 'Messages' },
  { href: '/insights', label: 'Insights' },
] as const;

export function AppNav({ email, userId, organizations = [] }: { email: string; userId?: string; organizations?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentOrganizationId = searchParams.get('organizationId');
  const scopedHref = (href: string) => currentOrganizationId && (href === '/workspace' || href === '/submissions') ? `${href}?organizationId=${encodeURIComponent(currentOrganizationId)}` : href;
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Cmd+K / Ctrl+K opens the command palette shell -- navigation-only for
  // this batch, per design-guidance-ui-redesign.md's "shell only" scope.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function handleSelectNav(href: string) {
    setCommandOpen(false);
    setMobileNavOpen(false);
    router.push(href);
  }

  return (
    <header className="relative z-50 flex min-w-0 items-center gap-3 border-b border-border bg-white px-4 py-3 sm:px-6">
      <Link href="/home" className="shrink-0 font-heading text-xl font-semibold text-foreground">Missa</Link>

      <NavigationMenu className="hidden lg:block">
        <NavigationMenuList className="gap-4">
          {NAV_LINKS.map((link) => (
            <NavigationMenuItem key={link.href}>
              <NavigationMenuLink
                render={<Link href={link.href} />}
                className={`relative py-2 text-sm transition-colors hover:text-primary ${pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'font-medium text-foreground after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground'}`}
                aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}
              >
                {link.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <button type="button" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted lg:hidden" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>
        {mobileNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />} className="ml-auto shrink-0 gap-2 text-sm text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-semibold text-white">{email.slice(0, 1).toUpperCase()}</span>
          <span className="hidden sm:inline">{email.split('@')[0]}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {userId && <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>}
          {userId && <DropdownMenuItem render={<Link href={scopedHref('/workspace')} />}>Workspace</DropdownMenuItem>}
          {userId && <DropdownMenuItem render={<Link href={scopedHref('/submissions')} />}>Submission inbox</DropdownMenuItem>}
          {userId && <DropdownMenuItem render={<Link href="/reviewer" />}>Reviewer queue</DropdownMenuItem>}
          {organizations.length > 0 && <div className="border-t border-border px-2 py-2"><p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Organizations</p>{organizations.map((organization) => <DropdownMenuItem key={organization.id} render={<Link href={`/workspace?organizationId=${encodeURIComponent(organization.id)}`} />}>{organization.name}</DropdownMenuItem>)}</div>}
          <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {mobileNavOpen && <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-b border-border bg-white p-2 shadow-lg lg:hidden">
        <div className="grid gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return <Link key={link.href} href={link.href} onClick={() => setMobileNavOpen(false)} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${active ? 'bg-accent-tint font-medium text-accent-deep' : 'text-foreground hover:bg-muted'}`}>{link.label}</Link>;
          })}
          {userId && <Link href="/profile" onClick={() => setMobileNavOpen(false)} aria-current={pathname === '/profile' ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${pathname === '/profile' ? 'bg-accent-tint font-medium text-accent-deep' : 'text-foreground hover:bg-muted'}`}>Profile</Link>}
          {organizations.length > 1 && <div className="mt-2 border-t border-border pt-2"><p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Organizations</p>{organizations.map((organization) => <Link key={organization.id} href={`/workspace?organizationId=${encodeURIComponent(organization.id)}`} onClick={() => setMobileNavOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-foreground hover:bg-muted">{organization.name}</Link>)}</div>}
        </div>
      </nav>}

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Jump to a page..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {NAV_LINKS.map((link) => (
              <CommandItem key={link.href} onSelect={() => handleSelectNav(link.href)}>
                {link.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
