import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const SeparatorMultiDemo = () => {
  return (
    <div className='bg-card w-full max-w-sm rounded-xl border p-4'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <h4 className='text-lg font-medium'>Olivia Martin</h4>
          <Badge variant='secondary' className='text-sm'>
            Pro
          </Badge>
        </div>
        <p className='text-muted-foreground text-sm'>
          Software developer focused on building scalable web applications and crafting intuitive user interfaces.
        </p>
      </div>

      <Separator className='my-4' />

      <div className='flex items-center justify-between text-sm sm:h-4'>
        <div className='flex items-center max-sm:flex-col sm:gap-2'>
          <span className='font-medium'>230</span>
          <span className='text-muted-foreground'>Posts</span>
        </div>
        <Separator orientation='vertical' />
        <div className='flex items-center max-sm:flex-col sm:gap-2'>
          <span className='font-medium'>14.5k</span>
          <span className='text-muted-foreground'>Followers</span>
        </div>
        <Separator orientation='vertical' />
        <div className='flex items-center max-sm:flex-col sm:gap-2'>
          <span className='font-medium'>1.2k</span>
          <span className='text-muted-foreground'>Following</span>
        </div>
      </div>
    </div>
  )
}

export default SeparatorMultiDemo
