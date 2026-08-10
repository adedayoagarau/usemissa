import { SettingsIcon } from "lucide-react";

const SpinnerShapesDemo = () => {
  return (
    <>
      <div className='flex w-full max-w-sm items-end max-sm:flex-wrap max-sm:gap-y-4 sm:justify-around sm:gap-6'>
        {/* Dashed Border Spinner */}
        <div className='flex flex-col items-center gap-4 max-sm:w-[50%]'>
          <div className='border-primary animation-duration-[3s] size-8 animate-spin rounded-full border-3 border-dashed' />
          <span className='text-muted-foreground text-sm font-medium'>Dashed Circle</span>
        </div>

        {/* Square Spinner */}
        <div className='flex flex-col items-center gap-4 max-sm:w-[50%]'>
          <div className='border-primary animation-duration-[3s] size-8 animate-spin border-3 border-dashed' />
          <span className='text-muted-foreground text-sm font-medium'>Dashed Square</span>
        </div>

        {/* Gear / Settings Icon Spinner */}
        <div className='flex flex-col items-center gap-4 max-sm:w-[50%]'>
          <SettingsIcon className='text-primary animation-duration-[2s] size-8 animate-spin' />
          <span className='text-muted-foreground text-sm font-medium'>Gear</span>
        </div>

        {/* Orbiting Dots Spinner (circular) */}
        <div className='flex flex-col items-center gap-2 max-sm:w-[50%]'>
          <div className='relative size-12'>
            <div className='border-primary/20 absolute inset-0 rounded-full border-2' />

            {/* center dot */}
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='bg-primary h-2 w-2 rounded-full' />
            </div>

            {/* orbiting dot (wrap in spinner to rotate around center) */}
            <div className='animation-duration-[1.5s] absolute inset-0 animate-spin'>
              <div className='bg-primary absolute top-1 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full' />
            </div>
          </div>
          <span className='text-muted-foreground text-sm font-medium'>Orbit</span>
        </div>
      </div>
    </>
  )
}

export default SpinnerShapesDemo
