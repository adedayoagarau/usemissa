import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { creatorRelationalAuthorityEnabled } from "@missa/radar-adapters";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { loadSeasonData, type SeasonData } from "@/lib/season-data";
import { creatorToday } from "@/lib/deadline-planning";
import { SeasonProduct } from "@/components/season-product";

export const metadata = { title: "Season" };

export default async function SeasonPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login?next=/season");

  const connectionString = process.env.DATABASE_URL;
  const relational = creatorRelationalAuthorityEnabled(process.env) && Boolean(connectionString);
  const data: SeasonData | null = relational && connectionString
    ? await loadSeasonData(connectionString, session.account.id).catch(() => null)
    : null;

  const today = data?.today ?? (await creatorToday(session.account.id));

  return (
    <SeasonProduct
      today={today}
      initialCalls={data?.calls ?? []}
      initialObligations={data?.obligations ?? []}
      initialTiers={data?.tiers ?? {}}
      initialForecasts={data?.forecasts ?? []}
      initialMatching={data?.matching ?? null}
      initialFeatures={data?.features ?? { capacityPlanning: false, seasonPlan: false }}
      initialWeeklyHours={data?.weeklyHours ?? null}
      unavailable={!data}
    />
  );
}
