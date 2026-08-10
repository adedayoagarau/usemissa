'use client'

import { useId } from 'react'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { PlusIcon } from "lucide-react"

const universities = [
  {
    value: '',
    label: 'Select university'
  },
  {
    value: 'harvard',
    label: 'Harvard University'
  },
  {
    value: 'cambridge',
    label: 'University of Cambridge'
  },
  {
    value: 'stanford',
    label: 'Stanford University'
  },
  {
    value: 'texas',
    label: 'University of Texas'
  }
]

const ComboboxWithSearchAndButtonDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Combobox with search and add button</Label>
      <Combobox id={id} items={universities} defaultValue={universities[0].value}>
        <ComboboxTrigger
          render={
            <Button variant='outline' className='w-full justify-between font-normal'>
              <ComboboxValue />
            </Button>
          }
        />
        <ComboboxContent>
          <ComboboxInput showTrigger={false} className='max-w-full' placeholder='Select university' />
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {item => (
                <ComboboxItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxCollection>
            <ComboboxSeparator />
            <Button variant='ghost' className='w-full justify-start font-normal'>
              <PlusIcon className='-ms-2 opacity-60' aria-hidden='true' />
              New university
            </Button>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxWithSearchAndButtonDemo
