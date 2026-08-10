import { useId } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'Select city', value: null },
  { label: 'New York', value: '1' },
  { label: 'London', value: '2' },
  { label: 'Tokyo', value: '3' },
  { label: 'Paris', value: '4' }
]

const SelectWithOverlappingLabelDemo = () => {
  const id = useId()

  return (
    <div className='group relative w-full max-w-xs'>
      <label
        htmlFor={id}
        className='bg-background text-foreground absolute top-0 left-2 z-10 block -translate-y-1/2 px-1 text-xs font-medium group-has-disabled:opacity-50'
      >
        Select with overlapping label
      </label>
      <Select items={items}>
        <SelectTrigger id={id} className='dark:bg-background! w-full'>
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

export default SelectWithOverlappingLabelDemo
