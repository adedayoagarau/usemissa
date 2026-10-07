import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { ProfileStudio } from "@/components/creator-profile/studio/profile-studio";
import { creatorShellOrganizations } from "@/lib/creatorShellOrganizations";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";

export const metadata = {
  title: "Public profile settings",
  robots: { index: false, follow: false },
};
export default async function PortfolioSettingsPage() {
  const session = await getSessionAccountFromToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId) redirect("/login?next=%2Fprofile%2Fportfolio");
  const [organizations, profile] = await Promise.all([
    creatorShellOrganizations(session.memberships),
    getCreatorProfileRepository()
      ?.profile(session.account.id)
      .catch(() => undefined),
  ]);
  return (
    <CreatorShell
      email={session.account.email}
      organizations={organizations}
      isAdmin={session.account.isAdmin}
    >
      <ProfileStudio
        ownerId={session.account.id}
        initialName={session.account.displayName ?? ""}
        initialBio={profile?.bio ?? ""}
      />
    </CreatorShell>
  );
}
