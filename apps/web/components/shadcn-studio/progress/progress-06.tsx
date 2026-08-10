import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressGradientDemo = () => {
  return (
    <div className='flex w-full flex-col gap-4'>
      {/* Progress Bar with Gradient Animation */}
      <Progress
        value={70}
        className='**:data-[slot=progress-indicator]:from-muted **:data-[slot=progress-indicator]:via-muted/70 **:data-[slot=progress-indicator]:to-primary **:data-[slot=progress-indicator]:rounded-l-full **:data-[slot=progress-indicator]:bg-linear-to-r'
      >
        <ProgressLabel>Uploading...</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Progress Bar with Moving Gradient Animation */}
      <Progress
        value={70}
        className='**:data-[slot=progress-indicator]:animate-gradient-flow **:data-[slot=progress-indicator]:from-primary **:data-[slot=progress-indicator]:via-muted/70 **:data-[slot=progress-indicator]:to-primary **:data-[slot=progress-indicator]:rounded-l-full **:data-[slot=progress-indicator]:bg-linear-to-r **:data-[slot=progress-indicator]:bg-size-[200%_100%]'
      >
        <ProgressLabel>Processing files</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>
    </div>
  )
}

export default ProgressGradientDemo
