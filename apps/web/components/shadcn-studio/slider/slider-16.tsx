'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { SquareIcon, CircleIcon } from "lucide-react"

const SliderRadiusDemo = () => {
  const [radius, setRadius] = useState(12)

  return (
    <div className='mx-auto flex w-full max-w-xs flex-col items-center gap-8'>
      {/* Real-time Preview Shape */}
      <div
        className='bg-primary/10 flex aspect-square w-28 items-center justify-center transition-all duration-300'
        style={{ borderRadius: `${radius}px` }}
      >
        <span className='text-sm font-medium tabular-nums'>{radius}px</span>
      </div>

      {/* Control Area */}
      <div className='flex w-full items-center gap-4'>
        <SquareIcon className='text-muted-foreground size-5 shrink-0' />
        <Slider
          value={radius}
          onValueChange={val => setRadius(val as number)}
          max={64}
          step={1}
          className='flex-1 cursor-pointer'
          aria-label='Adjust corner radius'
        />
        <CircleIcon className='text-muted-foreground size-5 shrink-0' />
      </div>
    </div>
  )
}

export default SliderRadiusDemo
