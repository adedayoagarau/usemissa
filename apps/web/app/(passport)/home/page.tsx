import { redirect } from 'next/navigation';

export default function HomeAliasPage() {
  // Route to the creator workspace ('Your space') with one meaningful next action.
  redirect('/workspace');
}
