'use client'

import { useState } from 'react'

import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

const SliderDynamicValueDemo = () => {
  const [volume, setVolume] = useState(65)
  const [priceRange, setPriceRange] = useState([200, 800])

  return (
    <div className='flex w-full max-w-xs flex-col gap-8 p-6'>
      {/* Volume Control Example */}
      <div>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>System Volume</Label>
          <div className='flex items-baseline gap-0.5'>
            <span className='text-sm font-medium tabular-nums'>{volume}</span>
            <span className='text-sm font-medium uppercase'>%</span>
          </div>
        </div>
        <Slider
          className='py-4'
          value={volume}
          onValueChange={v => setVolume(v as number)}
          max={100}
          step={1}
          aria-label='Volume slider'
        />
      </div>

      {/* Price Range Example */}
      <div>
        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>Price Range</Label>
          <div className='flex items-center gap-1.5 text-sm font-medium tabular-nums'>
            <span>${priceRange[0]}</span>
            <span>-</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
        <Slider
          className='py-4'
          value={priceRange}
          onValueChange={v => setPriceRange(v as number[])}
          max={1000}
          step={10}
          aria-label='Price range slider'
        />
      </div>
    </div>
  )
}

export default SliderDynamicValueDemo
