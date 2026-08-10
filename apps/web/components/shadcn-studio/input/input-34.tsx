'use client'

import { useId, useState, type ChangeEvent } from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

const maxLength = 50
const initialValue = ''

const InputCharacterLimitDemo = () => {
  const [value, setValue] = useState(initialValue)
  const [characterCount, setCharacterCount] = useState(initialValue.length)

  const id = useId()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length <= maxLength) {
      setValue(e.target.value)
      setCharacterCount(e.target.value.length)
    }
  }

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with character limit</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          type='text'
          placeholder='Username'
          value={value}
          maxLength={maxLength}
          onChange={handleChange}
        />
        <InputGroupAddon align='inline-end'>
          <span className='text-muted-foreground pointer-events-none text-xs tabular-nums'>
            {characterCount}/{maxLength}
          </span>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default InputCharacterLimitDemo
