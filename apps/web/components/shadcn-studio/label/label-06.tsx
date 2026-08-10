'use client'

import { useId, useState } from 'react'

import { Field } from '@/components/ui/field'
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
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Busy', value: 'busy' },
  { label: 'Away', value: 'away' }
]

const SelectWithLabel = () => {
  const id = useId()
  const [status, setStatus] = useState<string>('online')

  const statusColors: Record<string, string> = {
    online: 'bg-green-600 dark:bg-green-400',
    offline: 'bg-destructive',
    busy: 'bg-sky-600 dark:bg-sky-400',
    away: 'bg-amber-600 dark:bg-amber-400'
  }

  return (
    <Field className='w-full max-w-xs'>
      <Label htmlFor={id} className='gap-1.5'>
        Server Status
        <span className='relative flex size-2'>
          <span
            className={`absolute inline-flex size-full animate-ping rounded-full ${statusColors[status]} opacity-75`}
          />
          <span className={`relative inline-flex size-2 rounded-full ${statusColors[status]}`} />
        </span>
      </Label>
      <Select items={items} value={status} onValueChange={val => setStatus(val as string)}>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Server Status</SelectLabel>
            <SelectItem value='online'>Online</SelectItem>
            <SelectItem value='offline'>Offline</SelectItem>
            <SelectItem value='busy'>Busy</SelectItem>
            <SelectItem value='away'>Away</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

export default SelectWithLabel
