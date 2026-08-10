'use client'

import { useEffect, useState } from 'react'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Label } from '@/components/ui/label'
import { MinusIcon, CheckIcon } from "lucide-react"

const items = ['Child 1', 'Child 2', 'Child 3']

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

const CheckboxTreeDemo = () => {
  const [checked, setChecked] = useState<boolean>(false)
  const [indeterminate, setIndeterminate] = useState<boolean>(true)
  const [selected, setSelected] = useState<string[]>(['Child 1', 'Child 2'])

  useEffect(() => {
    if (selected.length === items.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true)
      setIndeterminate(false)
    } else if (selected.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(false)
      setIndeterminate(true)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(false)
      setIndeterminate(false)
    }
  }, [selected])

  const handleCheckedChange = (checked: boolean) => {
    setChecked(checked)

    if (checked === true) {
      setSelected([...items])
    } else if (checked === false) {
      setSelected([])
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <Checkbox id='parent' checked={checked} indeterminate={indeterminate} onCheckedChange={handleCheckedChange} />
        <Label htmlFor='parent'>Parent</Label>
      </div>
      <div className='flex flex-col gap-2 pl-6'>
        {items.map(label => (
          <div key={label} className='flex items-center gap-2'>
            <Checkbox
              id={label}
              checked={selected.includes(label)}
              onCheckedChange={checked =>
                setSelected(checked ? [...selected, label] : selected.filter(item => item !== label))
              }
            />
            <Label htmlFor={label}>{label}</Label>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CheckboxTreeDemo
