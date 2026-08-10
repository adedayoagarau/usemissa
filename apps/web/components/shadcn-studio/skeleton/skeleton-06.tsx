import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SkeletonChat = () => {
  return (
    <Card className='w-full max-w-xs'>
      <CardContent>
        {/* Incoming message */}
        <div className='flex items-start gap-2.5'>
          <Skeleton className='size-8 shrink-0 rounded-full' />
          <div className='flex flex-col gap-1'>
            <Skeleton className='h-3 w-20' />
            <Skeleton className='h-20 w-48 rounded-lg rounded-tl-none' />
            <Skeleton className='h-2.5 w-12' />
          </div>
        </div>
        {/* Outgoing message */}
        <div className='flex items-start justify-end gap-2.5'>
          <div className='flex flex-col items-end gap-1'>
            <Skeleton className='h-10 w-40 rounded-lg rounded-tr-none' />
            <Skeleton className='h-2.5 w-12' />
          </div>
        </div>
        {/* Incoming message */}
        <div className='flex items-start gap-2.5'>
          <Skeleton className='size-8 shrink-0 rounded-full' />
          <div className='flex flex-col gap-1'>
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-16 w-48 rounded-lg rounded-tl-none' />
            <Skeleton className='h-2.5 w-12' />
          </div>
        </div>
        {/* Input area */}
        <div className='flex items-center gap-2 pt-3'>
          <Skeleton className='h-8 flex-1 rounded-md' />
          <Skeleton className='size-8 rounded-md' />
          <Skeleton className='size-8 rounded-md' />
        </div>
      </CardContent>
    </Card>
  )
}

export default SkeletonChat
