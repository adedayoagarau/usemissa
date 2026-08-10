'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import Heart from '@/assets/svg/heart'

const ButtonGroupLikeDemo = () => {
  const [isLiked, setIsLiked] = useState(true)

  return (
    <ButtonGroup>
      <Button variant='outline' onClick={() => setIsLiked(!isLiked)}>
        {isLiked ? <Heart className='fill-destructive stroke-destructive' /> : <Heart />}
        Like
      </Button>
      <Button variant='outline' className='bg-background dark:border-input dark:bg-input/30'>
        {isLiked ? 46 : 45}
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupLikeDemo
