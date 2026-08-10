'use client'

import { useState } from 'react'

import { Slider } from '@/components/ui/slider'

const SliderFixDragDemo = () => {
  const clipDuration = 15
  const [values, setValues] = useState([10, 25])
  const min = 0
  const max = 60

  const handleValueChange = (newValues: number[]) => {
    const prevValues = values
    const movedIndex = newValues[0] !== prevValues[0] ? 0 : 1
    let [start, end] = newValues

    if (movedIndex === 0) {
      end = Math.min(start + clipDuration, max)
      start = end - clipDuration
    } else {
      start = Math.max(end - clipDuration, min)
      end = start + clipDuration
    }

    setValues([start, end])
  }

  return (
    <div className='bg-card flex w-full max-w-sm flex-col gap-4 rounded-lg border p-6 shadow-sm'>
      <div className='space-y-1'>
        <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-1'>
          <span className='text-sm font-medium uppercase'>Clip Selection</span>
          <span className='text-sm font-medium uppercase'>Length: {clipDuration}s</span>
        </div>
        <p className='text-muted-foreground text-xs font-medium'>Drag the window to select your 15s highlight.</p>
      </div>

      <div className='space-y-4'>
        <div className='relative space-y-4 pt-2'>
          <Slider value={values} onValueChange={v => handleValueChange(v as number[])} max={max} min={min} step={1} />
          <div className='text-muted-foreground flex justify-between text-xs font-medium uppercase'>
            <span>0s</span>
            <span>15s</span>
            <span>30s</span>
            <span>45s</span>
            <span>60s</span>
          </div>
        </div>

        {/* Dynamic Display */}
        <div className='flex items-center justify-center gap-2'>
          <div className='flex flex-col items-center'>
            <span className='text-muted-foreground text-sm font-medium uppercase'>Start</span>
            <span className='text-sm font-medium'>{values[0]}s</span>
          </div>
          <div className='bg-border mx-2 h-10 w-px' />
          <div className='flex flex-col items-center'>
            <span className='text-muted-foreground text-sm font-medium uppercase'>End</span>
            <span className='text-sm font-medium'>{values[1]}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SliderFixDragDemo
