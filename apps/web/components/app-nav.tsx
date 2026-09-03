'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Menu, X } from 'lucide-react';
import { MissaWordmark } from '@/components/missa-wordmark';

/** Shared authenticated identity shell. Tracker owns Submissions and Calendar;
 * Inbox and Profile remain utilities rather than competing primary products. */
const NAV_LINKS = [
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/saved', label: 'Saved' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/library', label: 'Library' },
] as const;
const VISIBLE_NAV_LINKS = NAV_LINKS;
const COMMAND_LINKS = [
  ...NAV_LINKS,
  { href: '/inbox', label: 'Inbox' },
  ...(process.env.NEXT_PUBLIC_MISSA_CHAT_ENABLED?.trim() === '1' ? [{ href: '/ask', label: 'Ask Missa' }] : []),
] as const;

export function AppNav({ email, userId, isAdmin = false, organizations = [] }: { email: string; userId?: string; isAdmin?: boolean; organizations?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentOrganizationId = searchParams.get('organizationId');
  const scopedHref = (href: string) => (currentOrganizationId && (href === '/workspace' || href === '/submissions') ? `${href}?organizationId=${encodeURIComponent(currentOrganizationId)}` : href);
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

  function handleOrganizationChange(organizationId: string) {
    if (!organizationId) return;
    const targetPath = pathname.startsWith('/workspace') || pathname === '/submissions' || pathname.startsWith('/submissions/') ? pathname : '/workspace';
    const next = new URLSearchParams(searchParams.toString());
    next.set('organizationId', organizationId);
    router.push(`${targetPath}?${next.toString()}`);
    setMobileNavOpen(false);
  }

  function organizationPicker(className: string) {
    if (organizations.length === 0) return null;
    return (
      <label className={`flex min-w-0 items-center gap-2 ${className}`}>
        <span className="sr-only">Organization</span>
        <select aria-label="Organization" value={organizations.some((organization) => organization.id === currentOrganizationId) ? currentOrganizationId! : (organizations[0]?.id ?? '')} onChange={(event) => handleOrganizationChange(event.target.value)} className="min-h-11 max-w-52 min-w-0 rounded-md border border-border bg-white px-2.5 text-xs font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <header className="relative z-50 flex min-w-0 items-center gap-3 border-b border-border bg-white px-4 py-3 sm:px-6">
      <MissaWordmark size="app" className="shrink-0 text-foreground" />

      <NavigationMenu className="hidden lg:block">
        <NavigationMenuList className="gap-4">
          {VISIBLE_NAV_LINKS.map((link) => (
            <NavigationMenuItem key={link.href}>
              <NavigationMenuLink render={<Link href={link.href} />} className={`relative py-2 text-sm transition-colors hover:text-primary ${pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'font-medium text-foreground after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground'}`} aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}>
                {link.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="hidden items-center gap-1 lg:flex">
        {userId && (
          <Link href="/inbox" aria-current={pathname === '/inbox' ? 'page' : undefined} className={`rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted ${pathname === '/inbox' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            Inbox
          </Link>
        )}
        {userId && (
          <Link href="/profile" aria-current={pathname === '/profile' ? 'page' : undefined} className={`rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted ${pathname === '/profile' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            Profile
          </Link>
        )}
        {organizations.length > 0 && (
          <Link href={scopedHref('/workspace')} aria-current={pathname.startsWith('/workspace') ? 'page' : undefined} className={`rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted ${pathname.startsWith('/workspace') ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            Organization
          </Link>
        )}
        {organizationPicker('ml-1')}
      </div>

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
          {userId && <DropdownMenuItem render={<Link href={scopedHref('/workspace')} />}>Organization</DropdownMenuItem>}
          {userId && <DropdownMenuItem render={<Link href={scopedHref('/submissions')} />}>Submission inbox</DropdownMenuItem>}
          {userId && <DropdownMenuItem render={<Link href="/reviews" />}>Reviews</DropdownMenuItem>}
          {isAdmin && <DropdownMenuItem render={<Link href="/admin" />}>Platform Admin</DropdownMenuItem>}
          {isAdmin && <DropdownMenuItem render={<Link href="/admin/taxonomy" />}>Policy → Taxonomy</DropdownMenuItem>}
          {organizations.length > 0 && (
            <div className="border-t border-border px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Organizations</p>
              {organizations.map((organization) => (
                <DropdownMenuItem key={organization.id} render={<Link href={`/workspace?organizationId=${encodeURIComponent(organization.id)}`} />}>
                  {organization.name}
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {mobileNavOpen && (
        <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-b border-border bg-white p-2 shadow-lg lg:hidden">
          <div className="grid gap-1">
            {VISIBLE_NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link key={link.href} href={link.href} onClick={() => setMobileNavOpen(false)} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${active ? 'bg-accent-tint font-medium text-accent-deep' : 'text-foreground hover:bg-muted'}`}>
                  {link.label}
                </Link>
              );
            })}
            {userId && (
              <Link href="/inbox" onClick={() => setMobileNavOpen(false)} aria-current={pathname === '/inbox' ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${pathname === '/inbox' ? 'bg-accent-tint font-medium text-accent-deep' : 'text-foreground hover:bg-muted'}`}>
                Inbox
              </Link>
            )}
            {userId && (
              <Link href="/profile" onClick={() => setMobileNavOpen(false)} aria-current={pathname === '/profile' ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${pathname === '/profile' ? 'bg-accent-tint font-medium text-accent-deep' : 'text-foreground hover:bg-muted'}`}>
                Profile
              </Link>
            )}
            {organizations.length > 0 && (
              <Link href={scopedHref('/workspace')} onClick={() => setMobileNavOpen(false)} aria-current={pathname.startsWith('/workspace') ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${pathname.startsWith('/workspace') ? 'bg-accent-tint font-medium text-accent-deep' : 'text-foreground hover:bg-muted'}`}>
                Organization
              </Link>
            )}
            {organizationPicker('mt-2 border-t border-border px-3 pt-3')}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMobileNavOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-foreground hover:bg-muted">
                Platform Admin
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/taxonomy" onClick={() => setMobileNavOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-foreground hover:bg-muted">
                Policy → Taxonomy
              </Link>
            )}
            {organizations.length > 1 && (
              <div className="mt-2 border-t border-border pt-2">
                <p className="px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Organizations</p>
                {organizations.map((organization) => (
                  <Link key={organization.id} href={`/workspace?organizationId=${encodeURIComponent(organization.id)}`} onClick={() => setMobileNavOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-foreground hover:bg-muted">
                    {organization.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      )}

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search pages" />
        <CommandList>
          <CommandEmpty>No matching page.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {COMMAND_LINKS.map((link) => (
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
