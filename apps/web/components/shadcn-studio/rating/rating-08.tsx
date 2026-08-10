'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

const EMOJIS = ['😡', '☹️', '😐', '🙂', '😍']
const LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Excellent']

const RatingEmojiDemo = () => {
  const [value, setValue] = useState<number | null>(null)

  return (
    <div className='w-full max-w-xs'>
      <h3 className='mb-3 text-center text-sm font-medium'>How was your experience?</h3>

      <div className='flex items-center justify-center gap-3'>
        {EMOJIS.map((emoji, i) => {
          const idx = i + 1

          return (
            <Button
              key={emoji}
              size='icon-lg'
              variant='outline'
              onClick={() => setValue(idx)}
              className='size-10 text-2xl'
            >
              {emoji}
            </Button>
          )
        })}
      </div>

      <div className='text-muted-foreground mt-3 min-h-5 text-center text-sm font-medium'>
        {value ? LABELS[value - 1] : ''}
      </div>
    </div>
  )
}

export default RatingEmojiDemo
