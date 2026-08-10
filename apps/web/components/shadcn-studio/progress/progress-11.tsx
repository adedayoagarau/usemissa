import { Progress } from '@/components/ui/progress'

const ProgressVerticalLabelsWithDemo = () => {
  return (
    <div className='flex items-end justify-center gap-8 py-4 xl:gap-10'>
      <div className='group flex flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>24%</span>
        <div className='bg-muted relative flex h-48 w-2 items-center justify-center overflow-hidden rounded-full transition-all'>
          <Progress
            value={24}
            className='absolute w-48 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium transition-colors'>CPU</span>
      </div>

      <div className='group flex flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>58%</span>
        <div className='bg-muted relative flex h-48 w-2 items-center justify-center overflow-hidden rounded-full transition-all'>
          <Progress
            value={58}
            className='absolute w-48 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium transition-colors'>RAM</span>
      </div>

      <div className='group flex flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>82%</span>
        <div className='bg-muted relative flex h-48 w-2 items-center justify-center overflow-hidden rounded-full transition-all'>
          <Progress
            value={82}
            className='absolute w-48 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium transition-colors'>DISK</span>
      </div>

      <div className='group flex flex-col items-center gap-4 transition-all duration-300'>
        <span className='cursor-default text-sm font-medium uppercase'>45%</span>
        <div className='bg-muted relative flex h-48 w-2 items-center justify-center overflow-hidden rounded-full transition-all'>
          <Progress
            value={45}
            className='absolute w-48 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:rounded-none'
          />
        </div>
        <span className='text-muted-foreground cursor-default text-sm font-medium transition-colors'>LOAD</span>
      </div>
    </div>
  )
}

export default ProgressVerticalLabelsWithDemo
