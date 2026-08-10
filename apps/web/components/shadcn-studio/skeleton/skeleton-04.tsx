import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SkeletonForm = () => {
  return (
    <Card className='w-full max-w-xs'>
      <CardContent className='space-y-4'>
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-4 w-24' />
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-8 w-full' />
          </div>
        </div>
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-8 w-full' />
        </div>
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-8 w-full' />
        </div>
        <Skeleton className='h-8 w-24' />
      </CardContent>
    </Card>
  )
}

export default SkeletonForm
