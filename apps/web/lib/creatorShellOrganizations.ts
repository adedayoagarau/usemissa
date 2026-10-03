import type { CreatorOrganization } from "@/components/creator-shell";
import { getCreatorAccountRepository } from "@/lib/creatorRepositories";
import { getEngine } from "@/lib/engine";

/**
 * Organization entries for the creator navigation. Names come from the
 * relational account store when it is configured and from the engine store
 * otherwise; an organization id is never shown as a name.
 */
export async function creatorShellOrganizations(
  memberships: ReadonlyArray<{ organizationId: string }>,
): Promise<CreatorOrganization[]> {
  if (!memberships.length) return [];
  const ids = memberships.map((membership) => membership.organizationId);
  const names = await organizationNames(ids);
  return ids.map((id) => {
    const name = names.get(id);
    return { id, name: name && name !== id ? name : "Organization" };
  });
}

async function organizationNames(ids: string[]): Promise<Map<string, string>> {
  const repository = getCreatorAccountRepository();
  if (repository) {
    const names = await repository.organizationNames(ids).catch(() => undefined);
    if (names) return names;
  }
  const engine = await getEngine().catch(() => undefined);
  const names = new Map<string, string>();
  for (const id of ids) {
    const name = engine?.store.organizations.get(id)?.name;
    if (name) names.set(id, name);
  }
  return names;
}
