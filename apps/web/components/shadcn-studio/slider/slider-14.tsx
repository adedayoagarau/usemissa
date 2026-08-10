'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { MinusIcon, PlusIcon } from "lucide-react"

const SliderDemo = () => {
  const [value, setValue] = React.useState(75)
  const min = 0
  const max = 100
  const step = 1

  const increment = () => {
    setValue(prev => Math.min(max, prev + step))
  }

  const decrement = () => {
    setValue(prev => Math.max(min, prev - step))
  }

  const handleSliderChange = (newValues: number) => {
    setValue(newValues)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value

    if (val === '') {
      setValue(min)

      return
    }

    const numericValue = parseInt(val)

    if (!isNaN(numericValue)) {
      setValue(Math.min(max, Math.max(min, numericValue)))
    }
  }

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-4 py-8'>
      <Label className='text-sm font-medium'>Precision Volume</Label>

      {/* The Integrated Stepper Container */}
      <div className='group bg-card flex items-center gap-2 rounded-lg border p-2'>
        <Button
          variant='outline'
          size='icon'
          className='rounded-md transition-all active:scale-95'
          onClick={decrement}
          disabled={value <= min}
          aria-label='Decrease value'
        >
          <MinusIcon className='size-5' />
        </Button>

        <div className='flex-1 px-2'>
          <Slider
            value={value}
            onValueChange={v => handleSliderChange(v as number)}
            min={min}
            max={max}
            step={step}
            className='cursor-pointer'
            aria-label='Adjust volume level'
          />
        </div>

        <Button
          variant='outline'
          size='icon'
          className='rounded-md transition-all active:scale-95'
          onClick={increment}
          disabled={value >= max}
          aria-label='Increase value'
        >
          <PlusIcon className='size-5' />
        </Button>

        <div>
          <Input
            type='number'
            value={value}
            onChange={handleInputChange}
            className='max-w-16 rounded-md text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
          />
        </div>
      </div>
    </div>
  )
}

export default SliderDemo
