import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'End-to-End User Flow & Navigation Map · Missa',
  description: 'Interactive visualizer of user journeys from Point A to Point Z, entry points, and edge cases across Missa.',
  robots: { index: false, follow: false },
};

export default function UserFlowsPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f4] flex flex-col">
      <header className="bg-white border-b border-[#e7e5e1] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/design-system" className="text-sm font-medium text-[#74716d] hover:text-[#171418]">
            ← Design System Index
          </Link>
          <span className="text-[#d4d0c9]">/</span>
          <span className="text-sm font-semibold text-[#5a3f68]">Interactive User Flow Visualizer</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/flow-map.html"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-[#5a3f68] text-white text-xs font-semibold rounded hover:bg-[#473050] transition-colors"
          >
            Open Standalone Fullscreen ↗
          </a>
        </div>
      </header>

      <main className="flex-1 w-full h-[calc(100vh-57px)]">
        <iframe
          src="/flow-map.html"
          className="w-full h-full border-0"
          title="Missa End-to-End User Flow Visualizer"
        />
      </main>
    </div>
  );
}
