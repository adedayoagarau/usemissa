import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { safeAuthRedirect } from "@/lib/authRedirect";
import { pageMetadata } from "@/lib/seo";
import {
  FIRST_SAVE_INTENT_COOKIE,
  firstSaveContext,
  verifyFirstSaveIntent,
} from "@/lib/firstSaveIntent";

export const metadata = pageMetadata({
  title: "Log in to Missa",
  description:
    "Log in to save opportunities, prepare applications, and keep every deadline in view.",
  path: "/login",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    next?: string;
    invite?: string;
  }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const { mode, next, invite } = await searchParams;
  const redirectTo = safeAuthRedirect(next);
  const firstSaveToken = cookieStore.get(FIRST_SAVE_INTENT_COOKIE)?.value;
  const firstSaveIntent = verifyFirstSaveIntent(firstSaveToken);
  if (session && !firstSaveIntent) redirect(redirectTo);
  const initialMode = mode === "signup" ? "signup" : "login";

  const inviteToken =
    typeof invite === "string" && /^[A-Za-z0-9_-]{32,128}$/u.test(invite)
      ? invite
      : undefined;
  return (
    <main id="main-content">
      <AuthForm
        initialMode={initialMode}
        redirectTo={redirectTo}
        firstSaveContext={
          firstSaveIntent ? firstSaveContext(firstSaveIntent) : undefined
        }
        authenticated={Boolean(session)}
        firstSaveUnavailable={Boolean(firstSaveToken && !firstSaveIntent)}
        inviteToken={inviteToken}
      />
    </main>
  );
}
