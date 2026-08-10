import { AspectRatio } from '@/components/ui/aspect-ratio'

const AspectRatioDemo = () => {
  return (
    <div className='flex w-full max-w-sm flex-col items-center gap-4'>
      <AspectRatio ratio={16 / 9} className='bg-muted flex w-full max-w-sm items-center justify-center rounded-lg'>
        <p className='text-xl font-medium md:text-3xl'>16:9</p>
      </AspectRatio>
      <p className='text-muted-foreground text-xs'>16:9 Aspect Ratio.</p>
    </div>
  )
}

export default AspectRatioDemo
