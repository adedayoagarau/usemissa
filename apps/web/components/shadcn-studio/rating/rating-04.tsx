'use client'

import { useState } from 'react'

import { Rating } from '@/components/ui/rating'

const RatingSizeDemo = () => {
  const [xs, setXs] = useState(2)
  const [s, setS] = useState(3)
  const [m, setM] = useState(2)
  const [l, setL] = useState(3)

  return (
    <div className='grid grid-cols-2 gap-6'>
      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Extra Small</div>
        <Rating size={16} precision={0.5} value={xs} onValueChange={setXs} aria-label='Rating Extra Small' />
      </div>
      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Small</div>
        <Rating size={20} precision={0.5} value={s} onValueChange={setS} aria-label='Rating Small' />
      </div>

      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Medium</div>
        <Rating size={24} precision={0.5} value={m} onValueChange={setM} aria-label='Rating Medium' />
      </div>
      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Large</div>
        <Rating size={28} precision={0.5} value={l} onValueChange={setL} aria-label='Rating Large' />
      </div>
    </div>
  )
}

export default RatingSizeDemo
