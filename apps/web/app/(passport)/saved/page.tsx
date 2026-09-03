import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  creatorRelationalAuthorityEnabled,
  listCanonicalTrackedOpportunities,
} from "@missa/radar-adapters";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import { SavedOpportunities } from "@/components/saved-opportunities";
import type { TrackerProductItem } from "@/components/tracker-product";

export default async function SavedPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login?next=/saved");

  const relational = creatorRelationalAuthorityEnabled(process.env) && Boolean(process.env.DATABASE_URL);
  const radar = await getEngine();
  const items: TrackerProductItem[] = relational && process.env.DATABASE_URL
    ? await listCanonicalTrackedOpportunities(process.env.DATABASE_URL, session.account.id)
    : Object.values(radar.getTracker(session.account.userId!).pipeline).flat();

  return <SavedOpportunities initialItems={items.filter((item) => ["interested", "saved"].includes(item.myStatus))} />;
}
