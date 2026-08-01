'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

/** Shared top nav for both the Passport and Workspace route groups --
 * labels match docs/missa-naming-decisions.md exactly. Do not reorganize
 * or rename these -- see docs/missa-naming-decisions.md. */
const NAV_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/library', label: 'Library' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/messages', label: 'Messages' },
  { href: '/insights', label: 'Insights' },
] as const;

export function AppNav({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);

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
    router.push(href);
  }

  return (
    <header className="flex items-center gap-6 border-b border-border px-6 py-3">
      <span className="font-heading text-xl font-semibold text-foreground">Missa</span>

      <NavigationMenu>
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

      <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />} className="ml-auto gap-2 text-sm text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-semibold text-white">{email.slice(0, 1).toUpperCase()}</span>
          <span className="hidden sm:inline">{email.split('@')[0]}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
