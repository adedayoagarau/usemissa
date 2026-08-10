import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressHeightDemo = () => {
  return (
    <div className='flex w-full flex-col gap-4'>
      {/* Default progress bar */}

      <Progress value={80}>
        <ProgressLabel>Default</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Medium progress bar */}
      <Progress value={70} className='*:data-[slot=progress-track]:h-2'>
        <ProgressLabel>Medium</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Large progress bar */}
      <Progress value={50} className='*:data-[slot=progress-track]:h-3'>
        <ProgressLabel>Large</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>

      {/* Extra Large progress bar */}
      <Progress value={30} className='*:data-[slot=progress-track]:h-4'>
        <ProgressLabel>Extra Large</ProgressLabel>
        <ProgressValue className='text-foreground font-medium' />
      </Progress>
    </div>
  )
}

export default ProgressHeightDemo
