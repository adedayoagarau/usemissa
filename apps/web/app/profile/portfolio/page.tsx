import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { ProfileStudio } from "@/components/creator-profile/studio/profile-studio";
import { creatorShellOrganizations } from "@/lib/creatorShellOrganizations";
import { publishedCreditTarget } from "@/lib/portfolio-server-facts";

export const metadata = {
  title: "Public profile settings",
  robots: { index: false, follow: false },
};
export default async function PortfolioSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ credit?: string | string[] }>;
}) {
  // "Credit as collaborator" on another profile links here with that handle.
  const { credit } = await searchParams;
  const requested =
    typeof credit === "string" && credit.trim()
      ? credit.trim().slice(0, 60)
      : undefined;
  const session = await getSessionAccountFromToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId)
    redirect(
      requested
        ? `/login?next=${encodeURIComponent(`/profile/portfolio?credit=${encodeURIComponent(requested)}`)}`
        : "/login?next=%2Fprofile%2Fportfolio",
    );
  const organizations = await creatorShellOrganizations(session.memberships);
  const creditPrefill = await publishedCreditTarget(
    { accountId: session.account.id, userId: session.account.userId },
    requested,
  );
  return (
    <CreatorShell
      email={session.account.email}
      organizations={organizations}
      isAdmin={session.account.isAdmin}
    >
      <ProfileStudio
        ownerId={session.account.id}
        initialName={session.account.displayName ?? ""}
        creditPrefill={creditPrefill}
      />
    </CreatorShell>
  );
}
