import { Progress, ProgressValue } from '@/components/ui/progress'

const ProgressVerticalLabelsWithinDemo = () => {
  return (
    <div className='flex h-48 items-end justify-center gap-8'>
      {/* 25% */}
      <div className='relative flex h-full w-4 items-center justify-center overflow-hidden rounded-full'>
        <Progress
          value={25}
          className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
        >
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-[25%]! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>

      {/* 50% */}
      <div className='relative flex h-full w-4 items-center justify-center overflow-hidden rounded-full'>
        <Progress
          value={50}
          className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
        >
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-[50%]! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>

      {/* 75% */}
      <div className='relative flex h-full w-4 items-center justify-center overflow-hidden rounded-full'>
        <Progress
          value={75}
          className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
        >
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-[75%]! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>

      {/* 100% */}
      <div className='relative flex h-full w-4 items-center justify-center overflow-hidden rounded-full'>
        <Progress
          value={100}
          className='absolute w-50 -rotate-90 rounded-none **:data-[slot=progress-indicator]:rounded-none *:data-[slot=progress-track]:h-4 *:data-[slot=progress-track]:rounded-none'
        >
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-full! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>
    </div>
  )
}

export default ProgressVerticalLabelsWithinDemo
