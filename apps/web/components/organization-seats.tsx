'use client';

import { useEffect, useState } from 'react';

const roles = ['member', 'admin', 'owner', 'team-admin', 'program-manager', 'reviewer', 'finance', 'legal', 'viewer', 'guest'] as const;
type Member = { accountId: string; email: string; role: string };
type SeatSummary = { used: number; limit: number; available: number };

async function readPeopleAndSeats(organizationId: string): Promise<{
  members: Member[];
  seats: SeatSummary;
}> {
  const [membersResponse, seatsResponse] = await Promise.all([fetch(`/api/orgs/${organizationId}/members`), fetch(`/api/orgs/${organizationId}/seats`)]);

  if (!membersResponse.ok || !seatsResponse.ok) {
    throw new Error('people-and-seats-unavailable');
  }

  return {
    members: await membersResponse.json(),
    seats: await seatsResponse.json(),
  };
}

export function OrganizationSeats({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [seats, setSeats] = useState<SeatSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const result = await readPeopleAndSeats(organizationId);
      setMembers(result.members);
      setSeats(result.seats);
      setError(null);
    } catch {
      setError('We could not load people and access. Try again.');
    }
  }

  useEffect(() => {
    let cancelled = false;

    void readPeopleAndSeats(organizationId)
      .then((result) => {
        if (cancelled) return;
        setMembers(result.members);
        setSeats(result.seats);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError('We could not load people and access. Try again.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  async function changeRole(accountId: string, role: string) {
    setError(null);
    const response = await fetch(`/api/orgs/${organizationId}/members/${accountId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'We could not change this role. Try again.');
      return;
    }
    await load();
  }

  async function remove(accountId: string) {
    if (!window.confirm('Remove this seat from the organization?')) return;
    setError(null);
    const response = await fetch(`/api/orgs/${organizationId}/members/${accountId}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'We could not remove this person. Try again.');
      return;
    }
    await load();
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm" aria-labelledby="organization-seats-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="organization-seats-heading" className="font-heading text-xl font-medium text-foreground">
            People and access
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage seats for everyone who prepares, reviews, and delivers submissions.</p>
        </div>
        {seats && (
          <p className="shrink-0 text-sm text-muted-foreground">
            <strong className="text-foreground">{seats.used}</strong> / {seats.limit} seats
          </p>
        )}
      </div>
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 divide-y divide-border border-y border-border">
        {members.map((member) => (
          <div key={member.accountId} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0 truncate text-sm text-foreground">{member.email}</span>
            <div className="flex items-center gap-2">
              {canManage ? (
                <select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => void changeRole(member.accountId, event.target.value)} className="rounded-md border border-border bg-white px-2 py-1.5 text-sm text-foreground">
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('-', ' ')}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-muted-foreground capitalize">{member.role.replace('-', ' ')}</span>
              )}
              {canManage && (
                <button type="button" onClick={() => void remove(member.accountId)} className="rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground hover:border-red-300 hover:text-red-700">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="py-3 text-sm text-muted-foreground">No seats assigned yet.</p>}
      </div>
    </section>
  );
}
