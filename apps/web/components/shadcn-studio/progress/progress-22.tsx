'use client'

import { useState } from 'react'
import { CircularProgress } from '@/components/ui/circular-progress'
import { Slider } from '@/components/ui/slider'
import { Settings2Icon, ShieldCheckIcon, ZapIcon } from "lucide-react"

const CircularProgressAnimationDemo = () => {
  const [progress, setProgress] = useState(54)

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col items-center justify-center p-6'>
      {/* Radial Progress Section - More Compact Margin */}
      <div className='relative mb-8 flex items-center justify-center'>
        <CircularProgress
          variant='animated'
          value={progress}
          size={130}
          strokeWidth={9}
          showLabel
          renderLabel={v => Math.round(v)}
          gaugePrimaryColor='var(--color-sky-600)'
          gaugeSecondaryColor='color-mix(in srgb, var(--color-primary), transparent 90%)'
          labelClassName='text-3xl font-medium'
        />
      </div>

      <div className='group relative w-full'>
        <div className='bg-card absolute inset-0 rounded-2xl border shadow-sm transition-transform duration-500 group-hover:rotate-0' />
        <div className='relative flex flex-col gap-4 p-5'>
          <div className='flex items-center justify-between px-0.5'>
            <div className='flex items-center gap-2'>
              <div className='rounded-lg bg-sky-600/20 p-1.5 dark:bg-sky-400/20'>
                <Settings2Icon className='size-4 text-sky-600 dark:text-sky-400' />
              </div>
              <h3 className='text-sm font-medium'>Control</h3>
            </div>
            <span className='text-sm font-medium text-sky-600 tabular-nums dark:text-sky-400'>LEVEL {progress}%</span>
          </div>

          {/* Slider Control - Compact padding */}
          <div className='py-1'>
            <Slider
              value={progress}
              max={100}
              onValueChange={val => setProgress(Array.isArray(val) ? val[0] : val)}
              step={1}
            />
          </div>

          {/* Compact Feature Grid */}
          <div className='grid grid-cols-2 gap-2'>
            <div className='flex items-center gap-2.5 px-0.5'>
              <div className='flex size-8 items-center justify-center rounded-full bg-green-600/20 dark:bg-green-400/20'>
                <ShieldCheckIcon className='size-4 text-green-600 dark:text-green-400' />
              </div>
              <div className='flex flex-col'>
                <span className='text-muted-foreground text-xs font-medium uppercase'>Status</span>
                <span className='text-xs font-medium'>Ready</span>
              </div>
            </div>

            <div className='flex items-center gap-2.5 px-0.5'>
              <div className='flex size-8 items-center justify-center rounded-full bg-amber-600/20 dark:bg-amber-400/20'>
                <ZapIcon className='size-4 text-amber-600 dark:text-amber-400' />
              </div>
              <div className='flex flex-col'>
                <span className='text-muted-foreground text-xs font-medium uppercase'>Boost</span>
                <span className='text-xs font-medium'>Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CircularProgressAnimationDemo
