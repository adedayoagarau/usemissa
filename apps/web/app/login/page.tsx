import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { safeAuthIntent, safeAuthRedirect } from "@/lib/authRedirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    next?: string;
    intent?: string;
    invite?: string;
  }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const { mode, next, intent, invite } = await searchParams;
  const redirectTo = safeAuthRedirect(next);
  if (session) redirect(redirectTo);
  const initialMode = mode === "signup" ? "signup" : "login";

  const inviteToken =
    typeof invite === "string" && /^[A-Za-z0-9_-]{32,128}$/u.test(invite)
      ? invite
      : undefined;
  return (
    <AuthForm
      initialMode={initialMode}
      redirectTo={redirectTo}
      intent={safeAuthIntent(intent)}
      inviteToken={inviteToken}
    />
  );
}
