import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

const SpinnerBlurDemo = () => {
  return (
    <Card className='relative w-full max-w-xs'>
      <CardContent className='space-y-3 p-4'>
        <h3 className='text-sm font-medium'>Dashboard Overview</h3>
        <p className='text-muted-foreground text-sm'>Monthly revenue and user statistics for the current period.</p>
        <div className='grid grid-cols-2 gap-4'>
          <div className='rounded-md border p-3'>
            <p className='text-muted-foreground text-xs'>Revenue</p>
            <p className='text-lg font-medium'>$12,450</p>
          </div>
          <div className='rounded-md border p-3'>
            <p className='text-muted-foreground text-xs'>Users</p>
            <p className='text-lg font-medium'>1,234</p>
          </div>
        </div>
      </CardContent>
      {/* Overlay */}
      <Card className='bg-background/80 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs'>
        <CardContent className='flex grow flex-col items-center justify-center gap-2'>
          <Spinner className='size-5 opacity-60' />
          <p className='text-muted-foreground text-sm font-medium'>Loading...</p>
        </CardContent>
      </Card>
    </Card>
  )
}

export default SpinnerBlurDemo
