import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";

export const metadata = {
  title: "Public profile settings",
  robots: { index: false, follow: false },
};
export default async function PortfolioSettingsPage() {
  const session = await getSessionAccountFromToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId) redirect("/login?next=%2Fprofile%2Fportfolio");
  return (
    <>
      <AppNav
        email={session.account.email}
        userId={session.account.userId}
        isAdmin={session.account.isAdmin}
        organizations={session.memberships.map((membership) => ({
          id: membership.organizationId,
          name: membership.organizationId,
        }))}
      />
      <CreatorPortfolioStudio ownerId={session.account.id} initialName={session.account.displayName ?? ""} />
    </>
  );
}
