import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FilmIcon } from "lucide-react"

const items = [
  { label: 'Select time', value: null },
  { label: 'God of Wars', value: 'god of wars' },
  { label: 'Ghost Rider', value: 'ghost rider' },
  { label: 'The Cloth', value: 'the cloth' },
  { label: 'The Possession', value: 'the possession' }
]

const SelectWithIconDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select with icon</Label>
      <Select items={items} defaultValue='god of wars'>
        <SelectTrigger id={id} className='relative w-full pl-9'>
          <div className='text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 group-has-[select[disabled]]:opacity-50'>
            <FilmIcon size={16} aria-hidden='true' />
          </div>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side='bottom' className='p-1'>
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

export default SelectWithIconDemo
