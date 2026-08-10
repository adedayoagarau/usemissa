import { useId } from 'react'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const items = [
  { label: 'Select a language', value: null },
  { label: 'Hindi', value: 'hindi' },
  { label: 'English', value: 'english' },
  { label: 'Spanish', value: 'spanish' },
  { label: 'Mandarin', value: 'mandarin' },
  { label: 'French', value: 'french' }
]

const SelectBackgroundColorDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select with background color</Label>
      <Select items={items} defaultValue='hindi'>
        <SelectTrigger className='w-full border-sky-600 bg-sky-600/10 text-sky-600 shadow-none focus-visible:border-sky-600 focus-visible:ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-400 dark:hover:bg-sky-400/10 dark:focus-visible:ring-sky-400/40 [&_svg]:text-sky-600! dark:[&_svg]:text-sky-400!'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup className='*:data-[slot=select-item]:not-data-[variant=destructive]:focus:**:text-sky-600 dark:*:data-[slot=select-item]:not-data-[variant=destructive]:focus:**:text-sky-400 [&_div:focus]:bg-sky-600/20 dark:[&_div:focus]:bg-sky-400/20'>
            <SelectLabel>Languages</SelectLabel>
            {items.slice(1).map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectBackgroundColorDemo
