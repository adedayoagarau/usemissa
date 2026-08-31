import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { MissaSiteHeader } from "@/components/missa-site-header";
import { Button } from "@/components/ui/button";

export function OpportunityCatalogueUnavailable({
  session,
}: {
  session: { email: string; hasOrganization: boolean } | null;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MissaSiteHeader session={session} />
      <main id="main-content" className="mx-auto grid min-h-[70vh] w-full max-w-[792px] place-items-center px-4 py-16 text-center">
        <div className="grid justify-items-center gap-4 rounded-2xl border border-border bg-card p-8 md:p-12" role="alert">
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground"><AlertTriangle aria-hidden="true" className="size-5" /></span>
          <h1 className="font-heading text-4xl tracking-tight">Opportunities are temporarily unavailable</h1>
          <p className="max-w-xl text-muted-foreground">Missa cannot confirm the catalogue right now. No fixture or stale substitute is being shown. Try again shortly.</p>
          <Button nativeButton={false} render={<Link href="/opportunities" />} variant="outline">Try opportunities again</Button>
        </div>
      </main>
    </div>
  );
}
