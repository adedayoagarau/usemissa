import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'Select framework', value: null },
  { label: 'Electronics', value: '1' },
  { label: 'Clothing', value: '2' },
  { label: 'Home Appliances', value: '3' },
  { label: 'Books', value: '4' }
]

const SelectWithColorBorderAndRingDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select with colored border and ring</Label>
      <Select items={items} defaultValue='1'>
        <SelectTrigger
          id={id}
          className='w-full focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 dark:focus-visible:ring-indigo-500/40'
        >
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
    </div>
  )
}

export default SelectWithColorBorderAndRingDemo
