import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { safeAuthRedirect } from "@/lib/authRedirect";
import { AuthForm } from "@/components/auth-form";
import {
  FIRST_SAVE_INTENT_COOKIE,
  firstSaveContext,
  verifyFirstSaveIntent,
} from "@/lib/firstSaveIntent";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; invite?: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const { next, invite } = await searchParams;
  const redirectTo = safeAuthRedirect(next);
  const firstSaveToken = cookieStore.get(FIRST_SAVE_INTENT_COOKIE)?.value;
  const firstSaveIntent = verifyFirstSaveIntent(firstSaveToken);
  if (session && !firstSaveIntent) redirect(redirectTo);
  const inviteToken =
    typeof invite === "string" && /^[A-Za-z0-9_-]{32,128}$/u.test(invite)
      ? invite
      : undefined;
  return (
    <AuthForm
      initialMode="signup"
      redirectTo={redirectTo}
      firstSaveContext={
        firstSaveIntent ? firstSaveContext(firstSaveIntent) : undefined
      }
      authenticated={Boolean(session)}
      firstSaveUnavailable={Boolean(firstSaveToken && !firstSaveIntent)}
      inviteToken={inviteToken}
    />
  );
}
