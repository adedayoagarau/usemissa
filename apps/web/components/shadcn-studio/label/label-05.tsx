'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckIcon, PencilIcon } from "lucide-react"

const ButtonWithLabel = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState('my-next-app')

  return (
    <Field className='w-full max-w-xs'>
      <Label htmlFor='label-inline-edit' className='gap-2'>
        Project Name
        <Button size='icon-xs' variant='ghost' onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? (
            <CheckIcon className='size-3.5' />
          ) : (
            <PencilIcon className='size-3.5' />
          )}
        </Button>
      </Label>
      {isEditing ? (
        <Input id='label-inline-edit' value={value} onChange={e => setValue(e.target.value)} autoFocus />
      ) : (
        <FieldDescription>{value}</FieldDescription>
      )}
    </Field>
  )
}

export default ButtonWithLabel
