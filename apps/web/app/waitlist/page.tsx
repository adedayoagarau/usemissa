import { redirect } from 'next/navigation';

const allowedCampaignKeys = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);

export default async function WaitlistPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = searchParams ? await searchParams : {};
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (!allowedCampaignKeys.has(key)) continue;
    const candidate = (Array.isArray(value) ? value[0] : value)?.slice(0, 120);
    if (candidate) next.set(key, candidate);
  }
  redirect(next.size ? `/signup?${next.toString()}` : '/signup');
}
