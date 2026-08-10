'use client'

import { useId } from 'react'

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'

const items = [
  {
    value: 'Fruits',
    items: ['Apples', 'Bananas', 'Cherries']
  },
  {
    value: 'Vegetables',
    items: ['Carrots', 'Broccoli', 'Spinach']
  },
  {
    value: 'Beverages',
    items: ['Tea', 'Coffee', 'Juice']
  }
]

const ComboboxOptionGroupDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Combobox option group</Label>
      <Combobox id={id} items={items}>
        <ComboboxInput placeholder='Select a timezone' />
        <ComboboxContent>
          <ComboboxEmpty>No timezones found.</ComboboxEmpty>
          <ComboboxList>
            {group => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {item => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxOptionGroupDemo
