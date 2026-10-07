import { OrganizationSeats } from '@/components/organization-seats';
import { getWorkspacePageAccess } from '@/lib/workspacePage';
import { Sp } from "@/components/missa/spelling";

export default async function WorkspacePeoplePage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const access = await getWorkspacePageAccess(searchParams, 'workspace/people', 'people.read');
  if (!access.organizationId)
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium text-foreground">People</h1>
        <p className="mt-2 text-muted-foreground"><Sp>Join an organization to manage people and roles.</Sp></p>
      </main>
    );
  const membership = access.session.memberships.find((item) => item.organizationId === access.organizationId);
  const canManage = membership?.role === 'admin' || membership?.role === 'owner';
  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{access.organizationName}</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-foreground">People</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground"><Sp>Invite teammates and assign roles. Only organization owners and admins can manage access.</Sp></p>
      </header>
      <div className="mt-6">
        <OrganizationSeats organizationId={access.organizationId} canManage={canManage} />
      </div>
    </main>
  );
}
