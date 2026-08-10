import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressStripedDemo = () => {
  return (
    <div className='flex w-[70%] flex-col gap-4 max-sm:w-full'>
      {/* Green with Stripe animation */}
      <Progress
        value={40}
        id='progress-green'
        className='**:data-[slot=progress-indicator]:animate-progress-bar-stripes **:data-[slot=progress-indicator]:bg-green-600 **:data-[slot=progress-indicator]:bg-[linear-gradient(45deg,rgba(255,255,255,0.28)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0.28)_75%,transparent_75%,transparent)] **:data-[slot=progress-indicator]:bg-size-[0.75rem_0.75rem] *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:bg-green-600/20 dark:**:data-[slot=progress-indicator]:bg-green-400 dark:*:data-[slot=progress-track]:bg-green-400/20'
      >
        <ProgressLabel>Green</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Amber with Stripe animation */}
      <Progress
        value={60}
        id='progress-amber'
        className='**:data-[slot=progress-indicator]:animate-progress-bar-stripes **:data-[slot=progress-indicator]:bg-amber-600 **:data-[slot=progress-indicator]:bg-[linear-gradient(45deg,rgba(255,255,255,0.28)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0.28)_75%,transparent_75%,transparent)] **:data-[slot=progress-indicator]:bg-size-[0.75rem_0.75rem] *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:bg-amber-600/20 dark:**:data-[slot=progress-indicator]:bg-amber-400 dark:*:data-[slot=progress-track]:bg-amber-400/20'
      >
        <ProgressLabel>Amber</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Sky with Stripe animation */}
      <Progress
        value={80}
        id='progress-sky'
        className='**:data-[slot=progress-indicator]:animate-progress-bar-stripes **:data-[slot=progress-indicator]:bg-sky-600 **:data-[slot=progress-indicator]:bg-[linear-gradient(45deg,rgba(255,255,255,0.28)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0.28)_75%,transparent_75%,transparent)] **:data-[slot=progress-indicator]:bg-size-[0.75rem_0.75rem] *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:bg-sky-600/20 dark:**:data-[slot=progress-indicator]:bg-sky-400 dark:*:data-[slot=progress-track]:bg-sky-400/20'
      >
        <ProgressLabel>Sky</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Destructive with Stripe animation */}
      <Progress
        value={50}
        id='progress-destructive'
        className='**:data-[slot=progress-indicator]:animate-progress-bar-stripes **:data-[slot=progress-indicator]:bg-destructive *:data-[slot=progress-track]:bg-destructive/20 **:data-[slot=progress-indicator]:bg-[linear-gradient(45deg,rgba(255,255,255,0.28)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0.28)_75%,transparent_75%,transparent)] **:data-[slot=progress-indicator]:bg-size-[0.75rem_0.75rem] *:data-[slot=progress-track]:h-2'
      >
        <ProgressLabel>Destructive</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>
    </div>
  )
}

export default ProgressStripedDemo
