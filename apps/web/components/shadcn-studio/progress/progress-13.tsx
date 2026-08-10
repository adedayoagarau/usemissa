import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

const ProgressLabelsWithinDemo = () => {
  return (
    <div className='flex w-full flex-col gap-4'>
      {/* 25% */}
      <div className='w-full'>
        <Progress id='progress-25' value={25} className='relative *:data-[slot=progress-track]:h-4'>
          <ProgressLabel className='sr-only'>Progress 25%</ProgressLabel>
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-[25%]! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>

      {/* 50% */}
      <div className='w-full'>
        <Progress id='progress-50' value={50} className='relative *:data-[slot=progress-track]:h-4'>
          <ProgressLabel className='sr-only'>Progress 50%</ProgressLabel>
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-[50%]! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>

      {/* 75% */}
      <div className='w-full'>
        <Progress id='progress-75' value={75} className='relative *:data-[slot=progress-track]:h-4'>
          <ProgressLabel className='sr-only'>Progress 75%</ProgressLabel>
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-[75%]! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>

      {/* 100% */}
      <div className='w-full'>
        <Progress id='progress-100' value={100} className='relative *:data-[slot=progress-track]:h-4'>
          <ProgressLabel className='sr-only'>Progress 100%</ProgressLabel>
          <ProgressValue
            aria-hidden='true'
            className='text-primary-foreground pointer-events-none absolute inset-y-0 left-0 z-1 flex w-full! items-center justify-center text-xs font-medium'
          />
        </Progress>
      </div>

      <p className='text-muted-foreground text-center text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://flyonui.com/docs/components/progress/#with-labels-horizontal'
          target='_blank'
          rel='noopener noreferrer'
        >
          Flyon UI
        </a>
      </p>
    </div>
  )
}

export default ProgressLabelsWithinDemo
