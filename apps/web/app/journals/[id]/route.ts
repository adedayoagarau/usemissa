import { getProfileRepository } from '@/lib/profileRepository';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, {params}: {params: Promise<{id:string}>}) {
  const {id} = await params;
  const repository = getProfileRepository();
  if (!repository) return new Response('The profile directory is unavailable.', {status:503});
  const profile = await repository.getById(id);
  if (!profile) return new Response('Profile not found.', {status:404});
  const roots: Record<string,string> = {literary_magazine:'journal',small_press:'press',residency_center:'residency',grant_foundation:'grant',visual_arts_organization:'org',organization:'org',gallery:'org'};
  const destination = new URL(request.url);
  destination.pathname = `/${roots[profile.kind] ?? 'org'}/${encodeURIComponent(profile.slug)}`;
  return new Response(null, {status:308, headers:{Location: destination.pathname + destination.search}});
}
