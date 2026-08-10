import { permanentRedirect } from 'next/navigation';

export default async function LegacySubmissionDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  permanentRedirect(`/tracker/submissions/${encodeURIComponent(submissionId)}`);
}
