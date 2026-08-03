import { LibraryClient } from '@/components/library-client';

export default function LibraryPage() {
  return <div className="mx-auto max-w-5xl"><header className="max-w-2xl"><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your Library</p><h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">Keep the parts of your work you use again.</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Save works, files, and answers once. Bring the right material to each submission without starting from a blank page.</p></header><LibraryClient /></div>;
}
