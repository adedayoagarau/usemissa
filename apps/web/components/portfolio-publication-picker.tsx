"use client";
import { useEffect, useId, useState } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "./ui/combobox";
import { Button } from "./ui/button";
export type PortfolioOrganization = {
  id: string;
  name: string;
  kind: string;
  href: string;
};
export function PortfolioPublicationPicker({
  name,
  organization,
  onChange,
}: {
  name: string;
  organization?: PortfolioOrganization;
  onChange: (name: string, organization?: PortfolioOrganization) => void;
}) {
  const id = useId();
  const [result, setResult] = useState<{
    query: string;
    items: PortfolioOrganization[];
    error?: string;
  }>({ query: "", items: [] });
  const [retry, setRetry] = useState(0);
  const query = name.trim();
  useEffect(() => {
    if (query.length < 2 || organization) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/publications/search?q=${encodeURIComponent(query)}`,
          { signal: abort.signal },
        );
        const data = await response.json();
        if (!abort.signal.aborted) setResult({ query, ...data });
      } catch {
        if (!abort.signal.aborted)
          setResult({
            query,
            items: [],
            error: "Search is unavailable. You can keep the name you entered.",
          });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, organization, retry]);
  const items = result.query === query ? result.items : [];
  const loading = query.length >= 2 && !organization && result.query !== query;
  return (
    <div className="grid gap-2">
      <label htmlFor={id}>Publication or organization</label>
      <Combobox
        items={items}
        value={organization ?? null}
        inputValue={name}
        filter={null}
        itemToStringLabel={(item) => item.name}
        onInputValueChange={(value, details) => {
          if (
            details.reason === "input-change" ||
            details.reason === "input-clear"
          )
            onChange(value);
        }}
        onValueChange={(item) => {
          if (item) onChange(item.name, item);
        }}
      >
        <ComboboxInput
          id={id}
          placeholder="Search the directory or enter a name"
          showTrigger={false}
        />
        <ComboboxContent>
          {loading && (
            <p role="status" className="p-3 text-sm text-muted-foreground">
              Searching the directory…
            </p>
          )}
          {!loading && !items.length && (
            <p className="p-3 text-sm text-muted-foreground">
              {query.length < 2
                ? "Type at least two characters."
                : result.error ||
                  "No matching entry. You can use the name you entered."}
            </p>
          )}
          <ComboboxList>
            {(item: PortfolioOrganization) => (
              <ComboboxItem key={item.id} value={item}>
                <span>
                  <strong className="block">{item.name}</strong>
                  <small className="text-muted-foreground">
                    {item.kind.replaceAll("_", " ")}
                  </small>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {organization ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Linked to {organization.name} in the directory.
          </p>
          <Button variant="ghost" onClick={() => onChange(name)}>
            Unlink
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a match to link its profile, or leave your own name as entered.
        </p>
      )}
      {result.error && !organization && (
        <Button
          variant="ghost"
          onClick={() => {
            setResult({ query: "", items: [] });
            setRetry(retry + 1);
          }}
        >
          Retry directory search
        </Button>
      )}
    </div>
  );
}
