import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'Tesla', value: '1' },
  { label: 'BMW', value: '2' },
  { label: 'Audi', value: '3' },
  { label: 'Mercedes-Benz', value: '4' }
]

const SelectInvalidState = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select with error</Label>
      <Select items={items} defaultValue='1'>
        <SelectTrigger id={id} aria-invalid className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='p-1'>
          {items.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className='text-destructive mt-2 text-xs' role='alert' aria-live='polite'>
        Selected option is invalid
      </p>
    </div>
  )
}

export default SelectInvalidState
