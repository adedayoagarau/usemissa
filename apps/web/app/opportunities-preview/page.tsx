import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductionOpportunitiesPreviewPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const raw = searchParams ? await searchParams : {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(key, item);
  }
  const query = params.toString();
  redirect(query ? `/opportunities?${query}` : '/opportunities');
}
