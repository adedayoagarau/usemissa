import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { ProfileInbox } from "@/components/creator-profile/profile-inbox";
import { creatorShellOrganizations } from "@/lib/creatorShellOrganizations";

export const metadata = {
  title: "Profile inbox",
  robots: { index: false, follow: false },
};

export default async function ProfileInboxPage() {
  const session = await getSessionAccountFromToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!session) redirect("/login?next=%2Fprofile%2Finbox");
  const organizations = await creatorShellOrganizations(session.memberships);
  return (
    <CreatorShell
      email={session.account.email}
      organizations={organizations}
      isAdmin={session.account.isAdmin}
    >
      <ProfileInbox />
    </CreatorShell>
  );
}
