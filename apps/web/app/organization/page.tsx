import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { OrganizationChooser } from '@/components/organization-chooser';
import styles from './organization.module.css';

export default async function OrganizationPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=%2Forganization');
  const radar = await getEngine();
  const organizations = session.memberships.flatMap((membership) => {
    const organization = radar.store.organizations.get(membership.organizationId);
    return organization ? [{ id: organization.id, name: organization.name, roleLabel: organizationCapabilityProjection(membership.role).label }] : [];
  }).sort((left, right) => left.name.localeCompare(right.name));

  return <main id="main-content" className={styles.page}><Link href="/profile" className={styles.back}>← Back to Profile</Link><header className={styles.header}><p>Organization</p><h1>{organizations.length ? 'Choose an Organization' : 'Connect an Organization'}</h1><span>{organizations.length ? 'Your role and access are shown before you enter. Return here whenever you need to switch.' : 'Organization access is for teams publishing Opportunities and operating submissions, reviews, decisions, communication, and delivery.'}</span></header>{organizations.length ? <OrganizationChooser organizations={organizations} /> : <section className={styles.none}><Building2 aria-hidden="true" /><h2>No Organization is connected yet</h2><p>Your creator Profile, Library, and Tracker are unchanged. Missa does not create an Organization or reveal membership from a guessed URL.</p><div><a href="mailto:hello@usemissa.com?subject=Create%20an%20Organization">Tell us about your Organization</a><a href="mailto:hello@usemissa.com?subject=Organization%20access">Ask to join an Organization</a></div></section>}</main>;
}
