"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Bookmark, ChevronDown, Navigation, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { WritingDocument } from "@/lib/writing-document";
import {
  readWritingBookmarks,
  resolveWritingLocation,
  writingLocations,
  writingNavigationKey,
  type WritingBookmark,
  type WritingLocation,
} from "@/lib/writing-navigation";

export type WritingNavigationAction = {
  id: string;
  label: string;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  run: () => void;
};
export type WritingNavigationProps = {
  accountId: string;
  entryId: string;
  document: WritingDocument;
  editors: Map<string, Editor>;
  active: { pageId: string; editor: Editor } | null;
  actions?: WritingNavigationAction[];
  onNavigate?: (location: WritingLocation, editor: Editor) => void;
};
/** Key the inner controller by account and entry to prevent locations leaking between drafts. */
export function WritingNavigation(props: WritingNavigationProps) {
  return (
    <NavigationController
      key={writingNavigationKey(props.accountId, props.entryId)}
      {...props}
    />
  );
}
function NavigationController({
  accountId,
  entryId,
  document: doc,
  editors,
  active,
  actions = [],
  onNavigate,
}: WritingNavigationProps) {
  const storageKey = writingNavigationKey(accountId, entryId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [bookmarks, setBookmarks] = useState<WritingBookmark[]>(() => {
    try {
      return typeof window === "undefined"
        ? []
        : readWritingBookmarks(window.localStorage.getItem(storageKey));
    } catch {
      return [];
    }
  });
  const [recent, setRecent] = useState<WritingLocation[]>(() => {
    try {
      return typeof window === "undefined"
        ? []
        : readWritingBookmarks(
            window.localStorage.getItem(`${storageKey}:recent`),
          );
    } catch {
      return [];
    }
  });
  const [message, setMessage] = useState("");
  const locations = useMemo(() => writingLocations(doc), [doc]);
  const headings = locations.filter((location) => location.headingLevel);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setQuery("");
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const persist = (next: WritingBookmark[]) => {
    setBookmarks(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setMessage("");
    } catch {
      setMessage(
        "Bookmarks are available for this session. Browser storage is unavailable.",
      );
    }
  };
  const navigate = (saved: WritingLocation) => {
    const location = resolveWritingLocation(saved, locations);
    const editor = location && editors.get(location.editorId);
    if (!location || !editor || editor.isDestroyed) {
      setMessage("This location is no longer available in the document.");
      return;
    }
    const nextRecent = [
      location,
      ...recent.filter(
        (item) =>
          item.text !== location.text ||
          item.occurrence !== location.occurrence,
      ),
    ].slice(0, 8);
    setRecent(nextRecent);
    try {
      window.localStorage.setItem(
        `${storageKey}:recent`,
        JSON.stringify(
          nextRecent.map((item, index) => ({ ...item, id: String(index) })),
        ),
      );
    } catch {
      /* Navigation continues when browser storage is unavailable. */
    }
    setOpen(false);
    // Let the dialog restore focus before focusing the page editor.
    window.setTimeout(() => {
      if (!editor.isDestroyed) {
        editor.commands.focus(location.position);
        onNavigate?.(location, editor);
      }
    }, 0);
  };
  const bookmark = () => {
    if (!active || active.editor.isDestroyed) {
      setMessage("Choose a place in your document first.");
      return;
    }
    const position = active.editor.state.selection.from;
    const location = locations
      .filter(
        (item) => item.editorId === active.pageId && item.position <= position,
      )
      .at(-1);
    if (!location) {
      setMessage("Write some text before bookmarking this place.");
      return;
    }
    if (
      bookmarks.some(
        (item) =>
          item.text === location.text &&
          item.occurrence === location.occurrence,
      )
    ) {
      setMessage("This place is already bookmarked.");
      return;
    }
    persist(
      [{ ...location, id: crypto.randomUUID() }, ...bookmarks].slice(0, 50),
    );
  };
  const locationItem = (location: WritingLocation, prefix: string) => (
    <CommandItem
      key={`${prefix}/${location.editorId}/${location.position}`}
      value={`${prefix} ${location.label} ${location.occurrence}`}
      onSelect={() => navigate(location)}
    >
      <span className="truncate">{location.label}</span>
      {location.headingLevel ? (
        <CommandShortcut>H{location.headingLevel}</CommandShortcut>
      ) : null}
    </CommandItem>
  );
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Navigate document"
        title="Navigate document (⌘/Ctrl+Shift+K)"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        <Navigation className="size-4" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(value) => {
          if (value) setQuery("");
          setOpen(value);
        }}
        title="Navigate document"
        description="Search headings, bookmarks and writing commands. Use the arrow keys to move and Enter to choose."
        showCloseButton
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Find a heading or command…"
          autoFocus
        />
        <CommandList>
          <CommandEmpty>No matching headings or commands.</CommandEmpty>
          <CommandGroup heading="Writing commands">
            <CommandItem onSelect={bookmark}>
              <Bookmark className="size-4" />
              Bookmark current paragraph
            </CommandItem>
            {actions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${(action.keywords ?? []).join(" ")}`}
                disabled={action.disabled}
                onSelect={() => {
                  setOpen(false);
                  action.run();
                }}
              >
                {action.label}
                {action.shortcut ? (
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
          <Collapsible
            open={outlineOpen || !!query}
            onOpenChange={setOutlineOpen}
          >
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                />
              }
              disabled={!!query}
            >
              Document outline
              <ChevronDown className="size-4" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CommandGroup>
                {headings.map((location) => locationItem(location, "heading"))}
              </CommandGroup>
              {headings.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Add headings to navigate your document.
                </p>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
          {bookmarks.length ? (
            <CommandGroup heading="Bookmarks">
              {bookmarks.map((saved) => {
                const available = resolveWritingLocation(saved, locations);
                return (
                  <CommandItem
                    key={saved.id}
                    value={`bookmark ${saved.label}`}
                    onSelect={() => navigate(saved)}
                  >
                    <Bookmark className="size-4" />
                    <span className="min-w-0 flex-1 truncate">
                      {saved.label}
                      {!available ? " · Text changed or removed" : ""}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}
          {bookmarks.length ? (
            <CommandGroup heading="Remove bookmarks">
              {bookmarks.map((saved) => (
                <CommandItem
                  key={`remove/${saved.id}`}
                  value={`Remove bookmark ${saved.label}`}
                  onSelect={() =>
                    persist(bookmarks.filter((item) => item.id !== saved.id))
                  }
                >
                  <Trash2 className="size-4" />
                  Remove: {saved.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {recent.length ? (
            <CommandGroup heading="Recent locations">
              {recent.map((location) => locationItem(location, "recent"))}
            </CommandGroup>
          ) : null}
        </CommandList>
        {message ? (
          <p
            role="status"
            className="border-t border-border px-3 py-2 text-sm text-muted-foreground"
          >
            {message}
          </p>
        ) : null}
      </CommandDialog>
    </>
  );
}
