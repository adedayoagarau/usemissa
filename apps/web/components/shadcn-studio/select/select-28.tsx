import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'Select a movie', value: null },
  { label: 'Inception', value: '1' },
  { label: 'Interstellar', value: '2' },
  { label: 'The Dark Knight', value: '3' },
  { label: 'Pulp Fiction', value: '4' }
]

const SelectWithLeadingTextDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select with leading text</Label>
      <Select items={items} defaultValue='1'>
        <SelectTrigger id={id} className='w-full'>
          Favorite Movie: <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side='bottom' className='p-1'>
          {items.slice(1).map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label.replace('Favorite Movie: ', '')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectWithLeadingTextDemo
