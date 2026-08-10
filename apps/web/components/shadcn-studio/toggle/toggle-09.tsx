'use client'

import { useState } from 'react'

import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

const ToggleEmoji = () => {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isFlipped2, setIsFlipped2] = useState(false)

  return (
    <div className='perspective-250 flex items-center justify-center gap-6'>
      <Toggle
        aria-label='emoji flip toggle'
        pressed={isFlipped}
        onPressedChange={setIsFlipped}
        className={cn(
          'relative bg-transparent text-3xl hover:bg-transparent aria-pressed:bg-transparent',
          'transition-transform duration-500 transform-3d',
          isFlipped ? 'transform-[rotateY(180deg)]' : 'transform-[rotateY(0deg)]'
        )}
      >
        <span className='absolute inset-0 backface-hidden'>😭</span>
        <span className='absolute inset-0 transform-[rotateY(180deg)] backface-hidden'>🥳</span>
      </Toggle>
      <Toggle
        aria-label='emoji flip toggle'
        pressed={isFlipped2}
        onPressedChange={setIsFlipped2}
        className={cn(
          'relative bg-transparent text-3xl hover:bg-transparent aria-pressed:bg-transparent',
          'transition-transform duration-500 transform-3d',
          isFlipped2 ? 'transform-[rotateY(180deg)]' : 'transform-[rotateY(0deg)]'
        )}
      >
        <span className='absolute inset-0 backface-hidden'>🥶</span>
        <span className='absolute inset-0 transform-[rotateY(180deg)] backface-hidden'>🥵</span>
      </Toggle>
    </div>
  )
}

export default ToggleEmoji
