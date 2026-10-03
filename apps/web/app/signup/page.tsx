import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { safeAuthRedirect } from "@/lib/authRedirect";
import { AuthForm } from "@/components/auth-form";
import { pageMetadata } from "@/lib/seo";
import {
  FIRST_SAVE_INTENT_COOKIE,
  firstSaveContext,
  verifyFirstSaveIntent,
} from "@/lib/firstSaveIntent";

export const metadata = pageMetadata({
  title: "Create your Missa account",
  description:
    "Create a free Missa account to save opportunities, track deadlines, and prepare applications with the official source in view.",
  path: "/signup",
  noIndex: true,
});

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
  // New accounts continue to setup unless a task brought them here; anyone
  // who switches to log in returns to the same task or to Opportunities.
  const loginRedirectTo = safeAuthRedirect(next);
  const redirectTo = next ? loginRedirectTo : "/onboarding";
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
      redirectTo={loginRedirectTo}
      signupRedirectTo={redirectTo}
      firstSaveContext={
        firstSaveIntent ? firstSaveContext(firstSaveIntent) : undefined
      }
      authenticated={Boolean(session)}
      firstSaveUnavailable={Boolean(firstSaveToken && !firstSaveIntent)}
      inviteToken={inviteToken}
    />
  );
}
