import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressShapeDemo = () => {
  return (
    <div className='flex w-full flex-col gap-3'>
      {/* Standard progress bar */}
      <div>
        <Progress value={40} id='progress-rounded' className='*:data-[slot=progress-track]:h-2'>
          <ProgressLabel>Rounded</ProgressLabel>
          <ProgressValue className='text-foreground font-medium' />
        </Progress>
      </div>

      {/* Pill progress bar */}
      <div>
        <Progress
          value={60}
          id='progress-pill'
          className='*:data-[slot=progress-indicator]:rounded-r-full *:data-[slot=progress-track]:h-2'
        >
          <ProgressLabel>Pill</ProgressLabel>
          <ProgressValue className='text-foreground font-medium' />
        </Progress>
      </div>

      {/* Sharp progress bar */}
      <div>
        <Progress
          value={80}
          id='progress-sharp'
          className='*:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:rounded-none'
        >
          <ProgressLabel>Sharp</ProgressLabel>
          <ProgressValue className='text-foreground font-medium' />
        </Progress>
      </div>
    </div>
  )
}

export default ProgressShapeDemo
