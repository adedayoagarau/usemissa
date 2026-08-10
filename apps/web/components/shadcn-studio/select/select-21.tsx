import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'Select framework', value: null },
  { label: 'United States', value: '1' },
  { label: 'Japan', value: '2' },
  { label: 'Australia', value: '3' },
  { label: 'Brazil', value: '4' }
]

const SelectRequiredDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id} className='gap-1'>
        Required select <span className='text-destructive'>*</span>
      </Label>
      <Select items={items} defaultValue='2' required>
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
    </div>
  )
}

export default SelectRequiredDemo
