import { Skeleton } from '@/components/ui/skeleton'

const SkeletonText = () => {
  return (
    <div className='flex w-full flex-col items-center gap-4'>
      <div className='flex w-full max-w-xs flex-col gap-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4' />
      </div>
      <div className='flex w-full max-w-xs flex-col gap-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4' />
      </div>
    </div>
  )
}

export default SkeletonText
