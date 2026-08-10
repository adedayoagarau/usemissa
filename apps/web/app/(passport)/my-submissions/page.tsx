import { permanentRedirect } from 'next/navigation';

export default function LegacyMySubmissionsPage() {
  permanentRedirect('/tracker?view=submissions');
}
