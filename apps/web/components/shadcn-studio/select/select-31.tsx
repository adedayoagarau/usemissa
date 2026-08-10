'use client'

import { useId } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

const users = [
  {
    id: null,
    name: 'Select framework'
  },
  {
    id: '1',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    fallback: 'PG',
    name: 'Phillip George'
  },
  {
    id: '2',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    fallback: 'JD',
    name: 'Jaylon Donin'
  },
  {
    id: '3',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    fallback: 'TC',
    name: 'Tiana Curtis'
  }
]

const SelectWithAvatarsDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Options with avatar</Label>
      <Select items={users.map(u => ({ label: u.name, value: u.id }))} defaultValue='1'>
        <SelectTrigger id={id} className='w-full pl-2'>
          <SelectValue>
            {(value: string) => {
              const user = users.find(u => u.id === value)

              return user && user.src ? (
                <span className='flex items-center gap-2'>
                  <Avatar className='size-5'>
                    <AvatarImage src={user.src} alt={user.name} className='rounded-full' />
                    <AvatarFallback className='text-xs'>{user.fallback}</AvatarFallback>
                  </Avatar>
                  <span className='truncate'>{user.name}</span>
                </span>
              ) : null
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className='pl-1.5'>Impersonate user</SelectLabel>
            {users.slice(1).map(item => (
              <SelectItem key={item.id} value={item.id}>
                <Avatar className='size-5'>
                  <AvatarImage src={item.src} alt={item.name} className='rounded-full' />
                  <AvatarFallback className='text-xs'>{item.fallback}</AvatarFallback>
                </Avatar>
                <span className='truncate'>{item.name}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectWithAvatarsDemo
