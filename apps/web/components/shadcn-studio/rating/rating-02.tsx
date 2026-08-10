'use client'

import { useState } from 'react'

import { Rating } from '@/components/ui/rating'

const RatingHalfStarDemo = () => {
  const [starCount, setStarCount] = useState(2.5)

  return (
    <div className='flex w-full max-w-xs items-center justify-center'>
      <Rating size={24} precision={0.5} value={starCount} onValueChange={setStarCount} />
    </div>
  )
}

export default RatingHalfStarDemo
