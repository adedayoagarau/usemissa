import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'Select framework', value: null },
  { label: 'Florida', value: '1' },
  { label: 'New York', value: '2' },
  { label: 'California', value: '3' },
  { label: 'Texas', value: '4' }
]

const SelectWithHelperTextDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select with helper text</Label>
      <Select items={items} defaultValue='3'>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='p-1'>
          {items.slice(1).map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className='text-muted-foreground mt-2 text-xs' role='region' aria-live='polite'>
        Could you share which city you&apos;re based in?
      </p>
    </div>
  )
}

export default SelectWithHelperTextDemo
