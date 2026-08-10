'use client'

import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { CircleXIcon } from "lucide-react"

const InputClearDemo = () => {
  const [value, setValue] = useState('Click to clear')

  const inputRef = useRef<HTMLInputElement>(null)

  const id = useId()

  const handleClearInput = () => {
    setValue('')

    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with clear button</Label>
      <InputGroup>
        <InputGroupInput
          ref={inputRef}
          id={id}
          type='text'
          placeholder='Type something...'
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        {value && (
          <InputGroupAddon align='inline-end'>
            <Button
              variant='ghost'
              size='icon'
              onClick={handleClearInput}
              className='text-muted-foreground hover:bg-transparent'
            >
              <CircleXIcon
              />
              <span className='sr-only'>Clear input</span>
            </Button>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  )
}

export default InputClearDemo
