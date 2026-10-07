'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Building2, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';

export interface PaletteLink {
  href: string;
  label: string;
  group: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

interface RemoteResult {
  kind: 'user' | 'organization';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/** ⌘K / Ctrl+K: jump to any admin page, user, or organization. */
export function AdminCommandPalette({ links, shortcut = true }: { links: PaletteLink[]; shortcut?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RemoteResult[]>([]);
  const request = useRef(0);

  useEffect(() => {
    if (!shortcut) return;
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const id = ++request.current;
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/search?q=${encodeURIComponent(term)}`)
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((payload: { results?: RemoteResult[] }) => {
          if (id === request.current) setResults(payload.results ?? []);
        })
        .catch(() => undefined);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  const groups = [...new Set(links.map((link) => link.group))];
  const visible = query.trim().length < 2 ? [] : results;
  const users = visible.filter((result) => result.kind === 'user');
  const organizations = visible.filter((result) => result.kind === 'organization');

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span className="flex-1 text-left text-xs text-muted-foreground">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search the admin" description="Jump to a page, user, or organization">
        <CommandInput placeholder="Pages, users by email or name, organizations…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{query.trim().length < 2 ? 'Type to search.' : 'Nothing matches.'}</CommandEmpty>
          {users.length > 0 && (
            <CommandGroup heading="Users">
              {users.map((result) => (
                <CommandItem key={result.id} value={`user ${result.title} ${result.subtitle} ${query}`} onSelect={() => go(result.href)}>
                  <User aria-hidden="true" />
                  <span className="truncate">{result.title}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{result.subtitle}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {organizations.length > 0 && (
            <CommandGroup heading="Organizations">
              {organizations.map((result) => (
                <CommandItem key={result.id} value={`organization ${result.title} ${result.subtitle} ${query}`} onSelect={() => go(result.href)}>
                  <Building2 aria-hidden="true" />
                  <span className="truncate">{result.title}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{result.subtitle}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {groups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {links.filter((link) => link.group === group).map((link) => {
                const Icon = link.icon;
                return (
                  <CommandItem key={link.href} value={`${link.label} ${group}`} onSelect={() => go(link.href)}>
                    <Icon aria-hidden={true} />
                    {link.label}
                    {link.href === '/admin' && <CommandShortcut>Home</CommandShortcut>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
