import { Skeleton } from '@/components/ui/skeleton'

const SkeletonTable = () => {
  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-4'>
      <div className='flex items-center gap-4 border-b pb-2'>
        <Skeleton className='size-8 rounded-md' />
        <Skeleton className='h-8 flex-1' />
        <Skeleton className='h-8 w-24' />
        <Skeleton className='h-8 w-20' />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='flex items-center gap-4'>
          <Skeleton className='size-8 rounded-md' />
          <Skeleton className='h-8 flex-1' />
          <Skeleton className='h-8 w-24' />
          <Skeleton className='h-8 w-20' />
        </div>
      ))}
    </div>
  )
}

export default SkeletonTable
