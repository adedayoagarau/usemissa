'use client'

import { useState } from 'react'

import { Rating } from '@/components/ui/rating'
import { Button } from '@/components/ui/button'

const RatingControlledDemo = () => {
  const [starCount, setStarCount] = useState(3)

  return (
    <div className='w-full max-w-md'>
      <div className='bg-card rounded-lg border p-4 shadow-sm'>
        <div className='flex items-baseline-last justify-between gap-4 sm:items-center'>
          <div className='flex gap-4 max-sm:flex-col sm:items-center'>
            <Rating size={36} precision={0.5} value={starCount} onValueChange={setStarCount} />

            <div className='flex flex-col'>
              <h3 className='text-sm font-medium'>Controlled Rating</h3>
              <p className='text-muted-foreground text-sm'>Select a value to rate</p>
            </div>
          </div>

          <div className='flex flex-col sm:items-end'>
            <div className='text-lg font-medium'>{starCount} / 5</div>
            <div className='text-muted-foreground text-xs font-medium'></div>
          </div>
        </div>

        <div className='mt-4 flex justify-between max-sm:flex-col max-sm:gap-2 sm:items-center'>
          <p className='text-muted-foreground text-sm'>
            Current rating: <span className='text-foreground font-medium'>{starCount}</span>
          </p>

          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' className='rounded-full text-sm' onClick={() => setStarCount(0)}>
              Clear
            </Button>

            <Button className='rounded-full text-sm' variant='outline' size='sm' onClick={() => setStarCount(5)}>
              Set to 5
            </Button>

            <Button className='rounded-full text-sm' variant='outline' size='sm' onClick={() => setStarCount(2.5)}>
              Set to 2.5
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RatingControlledDemo
