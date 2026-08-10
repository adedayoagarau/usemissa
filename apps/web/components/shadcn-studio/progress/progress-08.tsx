import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressColorDemo = () => {
  return (
    <div className='flex w-full flex-col gap-3'>
      {/* Progress with different colors */}
      {/* Green */}
      <Progress
        value={40}
        className='gap-2 **:data-[slot=progress-indicator]:bg-green-600 *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:bg-green-600/20 dark:**:data-[slot=progress-indicator]:bg-green-400 dark:*:data-[slot=progress-track]:bg-green-400/20'
      >
        <ProgressLabel>Green</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Amber */}
      <Progress
        value={60}
        className='gap-2 **:data-[slot=progress-indicator]:bg-amber-600 *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:bg-amber-600/20 dark:**:data-[slot=progress-indicator]:bg-amber-400 dark:*:data-[slot=progress-track]:bg-amber-400/20'
      >
        <ProgressLabel>Amber</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Sky */}
      <Progress
        value={80}
        className='gap-2 **:data-[slot=progress-indicator]:bg-sky-600 *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:bg-sky-600/20 dark:**:data-[slot=progress-indicator]:bg-sky-400 dark:*:data-[slot=progress-track]:bg-sky-400/20'
      >
        <ProgressLabel>Sky</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Destructive */}
      <Progress
        value={50}
        className='**:data-[slot=progress-indicator]:bg-destructive *:data-[slot=progress-track]:bg-destructive/20 gap-2 *:data-[slot=progress-track]:h-2'
      >
        <ProgressLabel>Destructive</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>
    </div>
  )
}

export default ProgressColorDemo
