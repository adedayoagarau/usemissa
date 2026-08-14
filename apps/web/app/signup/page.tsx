import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { safeAuthIntent, safeAuthRedirect } from "@/lib/authRedirect";
import { AuthForm } from "@/components/auth-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; intent?: string; invite?: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const { next, intent, invite } = await searchParams;
  const redirectTo = safeAuthRedirect(next);
  if (session) redirect(redirectTo);
  const inviteToken =
    typeof invite === "string" && /^[A-Za-z0-9_-]{32,128}$/u.test(invite)
      ? invite
      : undefined;
  return (
    <AuthForm
      initialMode="signup"
      redirectTo={redirectTo}
      intent={safeAuthIntent(intent)}
      inviteToken={inviteToken}
    />
  );
}
