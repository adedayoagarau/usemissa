'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import { MinusIcon, PlusIcon } from "lucide-react"

const ButtonGroupNumberDemo = () => {
  const [value, setValue] = useState(216)

  return (
    <ButtonGroup className='*:border-primary *:not-last:border-r-primary-foreground/30 *:bg-clip-border'>
      <Button
        size='icon'
        onClick={() => {
          setValue(value - 1)
        }}
      >
        <MinusIcon
        />
        <span className='sr-only'>Minus</span>
      </Button>
      <ButtonGroupText className='bg-primary text-primary-foreground'>{`${value}px`}</ButtonGroupText>
      <Button
        size='icon'
        onClick={() => {
          setValue(value + 1)
        }}
      >
        <PlusIcon
        />
        <span className='sr-only'>Plus</span>
      </Button>
    </ButtonGroup>
  )
}

export default ButtonGroupNumberDemo
