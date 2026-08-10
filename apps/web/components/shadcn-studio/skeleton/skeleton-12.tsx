import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const SkeletonWidgetsCards = () => {
  return (
    <div className='mx-auto grid w-full max-w-2xl grid-cols-2 gap-4 md:grid-cols-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className='gap-2 pb-2'>
            <Skeleton className='h-4 w-10' />
            <Skeleton className='h-8 w-24' />
          </CardHeader>
          <CardContent className='space-y-2'>
            <Skeleton className='h-4 w-full' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default SkeletonWidgetsCards
