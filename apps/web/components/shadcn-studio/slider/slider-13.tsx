'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

const SliderInputDemo = () => {
  const [opacity, setOpacity] = useState(1)

  const handleSliderChange = (newValues: number) => {
    setOpacity(newValues)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value

    if (val === '') {
      setOpacity(0)

      return
    }

    const newValue = parseFloat(val)

    if (!isNaN(newValue)) {
      const clampedValue = Math.min(1, Math.max(0, newValue))

      setOpacity(clampedValue)
    }
  }

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-6 p-6'>
      {/* The Controlled UI Group */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>Control Surface</Label>
          <span className='text-muted-foreground text-xs font-medium'>{Math.round(opacity * 100)}% Visible</span>
        </div>

        <Slider
          value={opacity}
          onValueChange={v => handleSliderChange(v as number)}
          min={0}
          max={1}
          step={0.01}
          aria-label='Adjust visibility'
        />
      </div>

      {/* The Constant Controller Area (Always Visible) */}
      <div className='bg-card flex items-center justify-between rounded-lg border p-4 shadow-sm'>
        <div className='flex flex-col gap-1' style={{ opacity: opacity }}>
          <Label className='text-sm font-medium uppercase'>Master Alpha</Label>
          <p className='text-muted-foreground text-xs'>Adjust opacity via input</p>
        </div>
        <div className='relative'>
          <Input
            type='number'
            value={opacity}
            onChange={handleInputChange}
            className='max-w-14 text-center text-sm transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            min={0}
            max={1}
            step={0.01}
          />
        </div>
      </div>
    </div>
  )
}

export default SliderInputDemo
