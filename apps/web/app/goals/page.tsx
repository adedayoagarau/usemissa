import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { GoalsWorkspace } from "@/components/missa/goals-workspace";
import { creatorShellOrganizations } from "@/lib/creatorShellOrganizations";
export const metadata = {
  title: "Your goals",
  description: "Track the goals you set in Missa and the work behind them.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSessionAccount((await cookies()).toString());
  if (!session) redirect("/login?next=%2Fgoals");
  const organizations = await creatorShellOrganizations(session.memberships);
  return (
    <CreatorShell
      email={session.account.email}
      organizations={organizations}
      isAdmin={session.account.isAdmin}
    >
      <GoalsWorkspace />
    </CreatorShell>
  );
}
