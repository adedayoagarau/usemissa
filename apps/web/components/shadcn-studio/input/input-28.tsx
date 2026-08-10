import { useId } from 'react'

import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const items = [
  { label: 'https://', value: 'https://' },
  { label: 'http://', value: 'http://' },
  { label: 'ftp://', value: 'ftp://' },
  { label: 'sftp://', value: 'sftp://' },
  { label: 'ws://', value: 'ws://' },
  { label: 'wss://', value: 'wss://' }
]

const InputStartSelectDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Input with start select</Label>
      <ButtonGroup className='w-full'>
        <Select items={items} defaultValue='https://'>
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
        <Input id={id} type='text' placeholder='shadcnstudio.com' />
      </ButtonGroup>
    </div>
  )
}

export default InputStartSelectDemo
