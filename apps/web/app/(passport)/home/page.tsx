import { redirect } from 'next/navigation';

export default function HomeAliasPage() {
  // A creator Home only earns this route when a typed, versioned next-task
  // projection exists. Until then, Opportunities is the most useful and
  // truthful signed-in destination; Inbox remains a separate utility.
  redirect('/opportunities');
}
