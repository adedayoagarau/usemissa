import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

/** The writing room moved to /doc. Old links, with the entry they name, land there. */
export default async function WriteRedirect({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const raw = searchParams ? await searchParams : {};
  const entry = Array.isArray(raw.entry) ? raw.entry[0] : raw.entry;
  redirect(entry ? `/doc?entry=${encodeURIComponent(entry)}` : "/doc");
}
