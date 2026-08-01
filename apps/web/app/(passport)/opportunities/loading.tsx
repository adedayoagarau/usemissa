import { Skeleton } from '@/components/ui/skeleton';

export default function OpportunitiesLoading() {
  return <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:p-8"><div className="space-y-6"><div className="space-y-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-10 w-72" /><Skeleton className="h-4 w-full max-w-xl" /></div><Skeleton className="h-11 w-full" /><div className="flex gap-2"><Skeleton className="h-11 w-28" /><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-24" /></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64 rounded-md" />)}</div></div><Skeleton className="hidden h-[calc(100vh-4rem)] lg:block" /></div>;
}
