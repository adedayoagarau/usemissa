'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { EyeOffIcon, EyeIcon } from "lucide-react"

const InputPasswordDemo = () => {
  const [isVisible, setIsVisible] = useState(false)

  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Password input</Label>
      <InputGroup>
        <InputGroupInput id={id} type={isVisible ? 'text' : 'password'} placeholder='Password' />
        <InputGroupAddon align='inline-end'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsVisible(prevState => !prevState)}
            className='text-muted-foreground focus-visible:ring-ring/50 rounded-l-none hover:bg-transparent'
          >
            {isVisible ? (
              <EyeOffIcon
              />
            ) : (
              <EyeIcon
              />
            )}
            <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputPasswordDemo
