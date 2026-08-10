'use client'

import { useId, useState } from 'react'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Label } from '@/components/ui/label'
import { MinusIcon, CheckIcon } from "lucide-react"

const Checkbox = (props: CheckboxPrimitive.Root.Props) => {
  return (
    <CheckboxPrimitive.Root
      data-slot='checkbox'
      className='peer border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-indeterminate:text-foreground dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary relative flex size-4 shrink-0 items-center justify-center rounded border transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3'
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot='checkbox-indicator'
        className='grid place-content-center text-current transition-none'
      >
        <MinusIcon className='hidden size-2.5 in-data-indeterminate:block' />
        <CheckIcon className='hidden size-3.5 in-data-checked:block' />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

const CheckboxIndeterminateDemo = () => {
  const [indeterminate, setIndeterminate] = useState<boolean>(true)
  const [checked, setChecked] = useState<boolean>(false)

  const id = useId()

  const handleCheckedChange = (isChecked: boolean) => {
    setIndeterminate(false)
    setChecked(isChecked)
  }

  return (
    <div className='flex items-center gap-2'>
      <Checkbox id={id} checked={checked} indeterminate={indeterminate} onCheckedChange={handleCheckedChange} />
      <Label htmlFor={id}>Indeterminate checkbox</Label>
    </div>
  )
}

export default CheckboxIndeterminateDemo
