import { Progress } from '@/components/ui/progress'

const ProgressVerticalSizesDemo = () => {
  return (
    <div className='flex items-end justify-center gap-6 py-4 xl:gap-10'>
      {/* Default */}
      <div className='group flex h-66 flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>80%</span>
        <div className='relative flex h-full w-1 items-center justify-center overflow-hidden rounded-full'>
          <Progress
            value={80}
            className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium text-nowrap transition-colors'>
          Default
        </span>
      </div>

      {/* Medium */}
      <div className='group flex h-66 flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>70%</span>
        <div className='relative flex h-full w-2 items-center justify-center overflow-hidden rounded-full'>
          <Progress
            value={70}
            className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium text-nowrap transition-colors'>
          Medium
        </span>
      </div>

      {/* Large */}
      <div className='group flex h-66 flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>50%</span>
        <div className='relative flex h-full w-3 items-center justify-center overflow-hidden rounded-full'>
          <Progress
            value={50}
            className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium text-nowrap transition-colors'>
          Large
        </span>
      </div>

      {/* Extra Large */}
      <div className='group flex h-66 flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>30%</span>
        <div className='relative flex h-full w-4 items-center justify-center overflow-hidden rounded-full'>
          <Progress
            value={30}
            className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium text-nowrap transition-colors'>
          Extra Large
        </span>
      </div>
    </div>
  )
}

export default ProgressVerticalSizesDemo
