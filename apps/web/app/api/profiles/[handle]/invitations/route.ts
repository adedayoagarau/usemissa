import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorConnectionsRepository } from "@/lib/creatorRepositories";
import {
  invitationInput,
  invitingOrganizations,
  publishedProfileOwner,
} from "@/lib/profile-connections";
import {
  deliverProfileConnectionEmail,
  renderProfileInvitationEmail,
} from "@/emails/profile-connections";

async function context(request: Request, rawHandle: string) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return {
      error: NextResponse.json(
        { error: "Sign in with your organization account to invite." },
        { status: 401 },
      ),
    };
  const owner = await publishedProfileOwner(rawHandle);
  if (!owner)
    return {
      error: NextResponse.json(
        { error: "Profile not found." },
        { status: 404 },
      ),
    };
  if (!owner.invitations || owner.accountId === session.account.id)
    return {
      error: NextResponse.json(
        { error: "This creator isn't taking invitations." },
        { status: 403 },
      ),
    };
  const organizations = await invitingOrganizations(session);
  if (!organizations.length)
    return {
      error: NextResponse.json(
        { error: "Only organization owners and managers can invite." },
        { status: 403 },
      ),
    };
  const repo = getCreatorConnectionsRepository();
  if (!repo)
    return {
      error: NextResponse.json(
        { error: "Invitations are unavailable right now." },
        { status: 503 },
      ),
    };
  return { session, owner, organizations, repo };
}

/** The inviter's open calls, marking any this creator was already invited to. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const found = await context(request, (await params).handle);
  if ("error" in found) return found.error;
  const options = await found.repo.inviteOptions(
    found.organizations.map((organization) => organization.id),
    found.owner.accountId,
  );
  return NextResponse.json(
    { organizations: found.organizations, options },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const found = await context(request, (await params).handle);
  if ("error" in found) return found.error;
  const parsed = invitationInput.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Choose a call." }, { status: 400 });
  const organization = found.organizations.find(
    (item) => item.id === parsed.data.organizationId,
  );
  if (!organization)
    return NextResponse.json(
      { error: "You can't invite for this organization." },
      { status: 403 },
    );
  const result = await found.repo.createInvitation({
    creatorAccountId: found.owner.accountId,
    organizationId: organization.id,
    opportunityId: parsed.data.opportunityId,
    inviterAccountId: found.session.account.id,
    message: parsed.data.message,
  });
  if (result.status === "duplicate")
    return NextResponse.json(
      { error: `${found.owner.name} already has an invitation for this call.` },
      { status: 409 },
    );
  if (result.status !== "created")
    return NextResponse.json(
      { error: "That call isn't open, published and yours." },
      { status: 400 },
    );
  const invitation = (await found.repo.invitations(found.owner.accountId)).find(
    (item) => item.id === result.id,
  );
  const email = await found.repo.accountEmail(found.owner.accountId);
  if (invitation && email)
    await deliverProfileConnectionEmail({
      kind: "profile-invitation",
      id: invitation.id,
      accountId: found.owner.accountId,
      email,
      rendered: renderProfileInvitationEmail({
        organizationName: invitation.organizationName,
        opportunityTitle: invitation.opportunityTitle,
        opportunityPath: `/opportunities/${invitation.opportunitySlug ?? invitation.opportunityId}`,
        deadline: invitation.deadline,
        message: invitation.message,
      }),
    }).catch(() => undefined);
  return NextResponse.json({ invited: true }, { status: 201 });
}
