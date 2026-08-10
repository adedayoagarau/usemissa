import { useId } from 'react'

import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: '.com', value: '.com' },
  { label: '.org', value: '.org' },
  { label: '.net', value: '.net' }
]

const InputEndSelectDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with end select</Label>
      <ButtonGroup className='w-full'>
        <Input id={id} type='text' placeholder='shadcnstudio' />
        <Select items={items} defaultValue='.com'>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map(item => (
              <SelectItem key={item.value} value={item.value} className='pr-2 [&_svg]:hidden'>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ButtonGroup>
    </div>
  )
}

export default InputEndSelectDemo
