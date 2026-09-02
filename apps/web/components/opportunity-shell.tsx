import type { ReactNode } from "react";
import { CreatorShell } from "@/components/creator-shell";
import { MissaSiteHeader } from "@/components/missa-site-header";

export function OpportunityShell({ session, children }: { session: { email: string; organizations: Array<{ id: string; name: string }>; isAdmin: boolean } | null; children: ReactNode }) {
  if (session) return <CreatorShell email={session.email} organizations={session.organizations} isAdmin={session.isAdmin}>{children}</CreatorShell>;
  return <><MissaSiteHeader session={null} />{children}</>;
}
