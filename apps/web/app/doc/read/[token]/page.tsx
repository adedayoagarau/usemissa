import { WritingReader } from "@/components/missa/writing-reader";

export const metadata = { title: "Reading copy · Missa", robots: { index: false, follow: false } };

export default async function ReaderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <WritingReader token={token} />;
}
