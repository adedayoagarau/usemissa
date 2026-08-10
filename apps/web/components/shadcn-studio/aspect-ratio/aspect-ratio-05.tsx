import { AspectRatio } from '@/components/ui/aspect-ratio'

const AspectRatioDemo = () => {
  return (
    <div className='flex w-full max-w-sm flex-col items-center gap-4'>
      <AspectRatio ratio={1 / 1} className='bg-muted flex w-full max-w-sm items-center justify-center rounded-lg'>
        <p className='text-xl font-medium md:text-3xl'>1:1</p>
      </AspectRatio>
      <p className='text-muted-foreground text-xs'>1:1 Aspect Ratio.</p>
    </div>
  )
}

export default AspectRatioDemo
