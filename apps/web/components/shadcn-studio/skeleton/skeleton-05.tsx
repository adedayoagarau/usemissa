import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SkeletonProfilePage = () => {
  return (
    <Card className='w-full overflow-hidden pt-0'>
      {/* Cover banner */}
      <Skeleton className='h-32 w-full rounded-none' />

      <CardContent className='space-y-4 pt-0'>
        {/* Avatar + action buttons row */}
        <div className='-mt-10 flex items-end justify-between'>
          <Skeleton className='ring-background size-20 rounded-full ring-4' />
          <Skeleton className='h-8 w-20 rounded-md' />
        </div>

        {/* Name and job title */}
        <div className='space-y-1.5'>
          <Skeleton className='h-4 w-36' />
          <Skeleton className='h-4 w-56' />
        </div>
      </CardContent>
    </Card>
  )
}

export default SkeletonProfilePage
