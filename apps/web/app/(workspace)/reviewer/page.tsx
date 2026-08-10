import { redirect } from 'next/navigation';

/** Compatibility route retained while existing links move to the Reviewer product. */
export default function ReviewerPage() {
  redirect('/reviews');
}
