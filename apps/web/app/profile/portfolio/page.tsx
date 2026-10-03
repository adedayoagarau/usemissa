import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";
import { creatorShellOrganizations } from "@/lib/creatorShellOrganizations";

export const metadata = {
  title: "Public profile settings",
  robots: { index: false, follow: false },
};
export default async function PortfolioSettingsPage() {
  const session = await getSessionAccountFromToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId) redirect("/login?next=%2Fprofile%2Fportfolio");
  const organizations = await creatorShellOrganizations(session.memberships);
  return (
    <CreatorShell
      email={session.account.email}
      organizations={organizations}
      isAdmin={session.account.isAdmin}
    >
      <CreatorPortfolioStudio ownerId={session.account.id} initialName={session.account.displayName ?? ""} />
    </CreatorShell>
  );
}
