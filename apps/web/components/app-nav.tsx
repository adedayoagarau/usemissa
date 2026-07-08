'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/submissions', label: 'Submissions' },
  { href: '/reviewer', label: 'Your reviews' },
] as const;

export function AppNav({ email }: { email: string }) {
  const router = useRouter();
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
                className="text-sm text-foreground hover:text-primary"
              >
                {link.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />} className="ml-auto text-sm text-muted-foreground">
          {email}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
