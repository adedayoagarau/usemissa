import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { organizationCapabilityProjection } from '@/lib/organizationProduct';
import { OrganizationChooser } from '@/components/organization-chooser';
import styles from './organization.module.css';
import { contactMailto } from "@/lib/legalContact";

export const metadata = {
  title: 'Choose an organization',
  description: 'Open the Missa organization workspace you belong to.',
  robots: { index: false, follow: false },
};

export default async function OrganizationPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=%2Forganization');
  const radar = await getEngine();
  const organizations = session.memberships.flatMap((membership) => {
    const organization = radar.store.organizations.get(membership.organizationId);
    return organization ? [{ id: organization.id, name: organization.name, roleLabel: organizationCapabilityProjection(membership.role).label }] : [];
  }).sort((left, right) => left.name.localeCompare(right.name));

  return <main id="main-content" className={styles.page}><Link href="/profile" className={styles.back}>← Back to Profile</Link><header className={styles.header}><p>Organization</p><h1>{organizations.length ? 'Choose an organization' : 'Connect an organization'}</h1><span>{organizations.length ? 'Your role and access are shown before you enter. Return here whenever you need to switch.' : 'Organization access is for teams who post calls and run submissions, reviews, decisions, messages and delivery.'}</span></header>{organizations.length ? <OrganizationChooser organizations={organizations} /> : <section className={styles.none}><Building2 aria-hidden="true" /><h2>No organization is connected yet</h2><p>Your Profile, Library and Tracker stay as they are. Missa does not create an organization or reveal membership from a guessed URL.</p><div><a href={contactMailto("Create an organization")}>Tell us about your organization</a><a href={contactMailto("Organization access")}>Ask to join an organization</a></div></section>}</main>;
}
