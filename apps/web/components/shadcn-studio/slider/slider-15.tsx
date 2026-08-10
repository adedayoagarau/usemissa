'use client'

import { useState } from 'react'

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

const SliderRatingDemo = () => {
  const [rating, setRating] = useState(50)

  const getRatingData = (val: number) => {
    if (val <= 20) return { emoji: '😡', label: 'Poor' }
    if (val <= 40) return { emoji: '😕', label: 'Not Good' }
    if (val <= 60) return { emoji: '😐', label: 'Average' }
    if (val <= 80) return { emoji: '🙂', label: 'Great' }

    return { emoji: '🤩', label: 'Amazing!' }
  }

  const { emoji, label } = getRatingData(rating)

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col p-8'>
      <Label className='mb-2 text-sm font-medium'>Rate your experience</Label>
      <div className='flex items-center gap-4'>
        <div className='flex-1'>
          <Slider
            value={rating}
            onValueChange={v => setRating(v as number)}
            min={0}
            max={100}
            step={1}
            className='cursor-pointer'
            aria-label='Experience rating slider'
          />
        </div>

        <span
          className='animate-in fade-in zoom-in scale-110 transition-all duration-500 select-none'
          role='img'
          aria-label='Current rating'
        >
          {emoji}
        </span>
      </div>

      <span className='text-muted-foreground text-sm font-medium transition-all duration-300'>{label}</span>
    </div>
  )
}

export default SliderRatingDemo
