import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SkeletonCard = () => {
  return (
    <Card className='w-full max-w-xs'>
      <CardHeader className='flex items-center gap-4'>
        <Skeleton className='size-12 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-4 w-25' />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className='aspect-video w-full' />
      </CardContent>
    </Card>
  )
}

export default SkeletonCard
