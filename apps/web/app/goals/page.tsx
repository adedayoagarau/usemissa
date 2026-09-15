import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccount } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { GoalsWorkspace } from "@/components/missa/goals-workspace";
export const metadata = {
  title: "Your practice goals",
  description: "Track the practice goals you set in Missa and the work behind them.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getSessionAccount((await cookies()).toString());
  if (!session) redirect("/login?next=%2Fgoals");
  return (
    <CreatorShell email={session.account.email}>
      <GoalsWorkspace />
    </CreatorShell>
  );
}
