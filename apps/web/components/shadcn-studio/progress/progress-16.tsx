'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { CircularProgress } from '@/components/ui/circular-progress'
import { HardDriveIcon } from "lucide-react"

const CircularProgressStorageDemo = () => {
  const [progress, setProgress] = useState(75)
  const totalStorage = 256
  const usedStorage = Math.round((progress / 100) * totalStorage)

  return (
    <div className='mx-auto flex w-full flex-col items-center gap-6 py-8'>
      <div className='flex flex-col items-center gap-4'>
        <div className='bg-muted/30 dark:bg-muted/10 flex items-center gap-2 rounded-full border px-3 py-1'>
          <HardDriveIcon className='text-muted-foreground size-3.5' />
          <span className='text-muted-foreground text-xs font-medium uppercase'>Storage</span>
        </div>

        <div className='relative'>
          <CircularProgress
            size={110}
            strokeWidth={8}
            value={progress}
            showLabel
            progressClassName='transition-all duration-300 ease-in-out stroke-primary'
            labelClassName='font-medium text-xl'
            progressBgClassName='stroke-primary/10'
          />
        </div>

        <div className='flex flex-col items-center gap-0.5'>
          <p className='text-sm font-medium tabular-nums'>
            {totalStorage - usedStorage} GB out of {totalStorage} GB
          </p>
          <p className='text-muted-foreground text-xs font-medium uppercase'>Available Space</p>
        </div>
      </div>

      <div className='w-full px-4'>
        <Slider
          value={progress}
          max={100}
          onValueChange={val => setProgress(Array.isArray(val) ? val[0] : val)}
          step={1}
          className='cursor-pointer'
        />
      </div>
    </div>
  )
}

export default CircularProgressStorageDemo
