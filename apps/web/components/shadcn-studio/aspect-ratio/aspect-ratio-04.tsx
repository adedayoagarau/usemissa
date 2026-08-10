import { AspectRatio } from '@/components/ui/aspect-ratio'

const AspectRatioDemo = () => {
  return (
    <div className='flex w-full max-w-sm flex-col items-center gap-4'>
      <AspectRatio ratio={4 / 3} className='bg-muted flex w-full max-w-sm items-center justify-center rounded-lg'>
        <p className='text-xl font-medium md:text-3xl'>4:3</p>
      </AspectRatio>
      <p className='text-muted-foreground text-xs'>4:3 Aspect Ratio.</p>
    </div>
  )
}

export default AspectRatioDemo
