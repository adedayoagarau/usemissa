'use client';

import { useEffect, useState } from 'react';

const roles = ['member', 'admin', 'owner', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest'] as const;
type Member = { accountId: string; email: string; role: string };

export function OrganizationSeats({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [seats, setSeats] = useState<{ used: number; limit: number; available: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [membersResponse, seatsResponse] = await Promise.all([
      fetch(`/api/orgs/${organizationId}/members`),
      fetch(`/api/orgs/${organizationId}/seats`),
    ]);
    if (!membersResponse.ok || !seatsResponse.ok) { setError('Unable to load organization seats'); return; }
    setMembers(await membersResponse.json());
    setSeats(await seatsResponse.json());
  }

  // The panel owns a small read model fetched when the organization changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [organizationId]);

  async function changeRole(accountId: string, role: string) {
    setError(null);
    const response = await fetch(`/api/orgs/${organizationId}/members/${accountId}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role }),
    });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error ?? 'Unable to change role'); return; }
    await load();
  }

  async function remove(accountId: string) {
    if (!window.confirm('Remove this seat from the organization?')) return;
    setError(null);
    const response = await fetch(`/api/orgs/${organizationId}/members/${accountId}`, { method: 'DELETE' });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error ?? 'Unable to remove member'); return; }
    await load();
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm" aria-labelledby="organization-seats-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="organization-seats-heading" className="font-heading text-xl font-medium text-foreground">People and access</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage seats for everyone who prepares, reviews, and delivers submissions.</p>
        </div>
        {seats && <p className="shrink-0 text-sm text-muted-foreground"><strong className="text-foreground">{seats.used}</strong> / {seats.limit} seats</p>}
      </div>
      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-4 divide-y divide-border border-y border-border">
        {members.map((member) => (
          <div key={member.accountId} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0 truncate text-sm text-foreground">{member.email}</span>
            <div className="flex items-center gap-2">
              {canManage ? (
                <select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => void changeRole(member.accountId, event.target.value)} className="rounded-md border border-border bg-white px-2 py-1.5 text-sm text-foreground">
                  {roles.map((role) => <option key={role} value={role}>{role.replace('-', ' ')}</option>)}
                </select>
              ) : <span className="text-sm capitalize text-muted-foreground">{member.role.replace('-', ' ')}</span>}
              {canManage && <button type="button" onClick={() => void remove(member.accountId)} className="rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground hover:border-red-300 hover:text-red-700">Remove</button>}
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="py-3 text-sm text-muted-foreground">No seats assigned yet.</p>}
      </div>
    </section>
  );
}
