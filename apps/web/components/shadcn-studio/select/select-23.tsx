import { useId } from 'react'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const northAmerica = [
  { label: 'United States', value: '1' },
  { label: 'Canada', value: '2' },
  { label: 'Mexico', value: '3' }
]

const europe = [
  { label: 'United Kingdom', value: '4' },
  { label: 'Germany', value: '5' },
  { label: 'France', value: '6' }
]

const asia = [
  { label: 'India', value: '7' },
  { label: 'Japan', value: '8' },
  { label: 'China', value: '9' }
]

const items = [{ label: 'Select framework', value: null }, ...northAmerica, ...europe, ...asia]

const SelectWithSeparatorDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select with separator</Label>
      <Select items={items} defaultValue='7'>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>North America</SelectLabel>
            {northAmerica.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Europe</SelectLabel>
            {europe.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Asia</SelectLabel>
            {asia.map(item => (
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

export default SelectWithSeparatorDemo
