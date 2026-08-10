'use client'

import { useId, useState } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'

const users = [
  {
    name: 'Phillip George',
    email: 'phillip12@gmail.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    status: 'online'
  },
  {
    name: 'Jaylon Donin',
    email: 'jaylo-don@yahoo.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    status: 'offline'
  },
  {
    name: 'Tiana Curtis',
    email: 'tiana_curtis@gmail.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    status: 'away'
  },
  {
    name: 'Zaire Vetrovs',
    email: 'zaire.vetrovs@outlook.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png',
    status: 'online'
  },
  {
    name: 'Kianna Philips',
    email: 'kiannaphilips@gmail.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    status: 'busy'
  },
  {
    name: 'John Doe',
    email: 'john2doe@icloud.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    status: 'online'
  },
  {
    name: 'Rock Lee',
    email: 'rocklee@protonmail.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-7.png',
    status: 'busy'
  },
  {
    name: 'Henry Potter',
    email: 'henry3potter@gmail.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-8.png',
    status: 'online'
  }
]

const ComboboxInput = ({
  className,
  children,
  disabled = false,
  showTrigger = true,
  avatarSrc,
  fallback,

  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  avatarSrc?: string
  fallback?: string
}) => {
  return (
    <InputGroup className={cn('w-auto', className)}>
      {avatarSrc && (
        <InputGroupAddon>
          <Avatar className='size-5'>
            <AvatarImage src={avatarSrc} alt='User Avatar' />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </InputGroupAddon>
      )}
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
      <InputGroupAddon align='inline-end'>
        {showTrigger && (
          <InputGroupButton
            size='icon-xs'
            variant='ghost'
            render={<ComboboxTrigger />}
            data-slot='input-group-button'
            className='data-pressed:bg-transparent'
            disabled={disabled}
          />
        )}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

const ComboboxUserDemo = () => {
  const id = useId()
  const [value, setValue] = useState<string>('')
  const selectedUser = users.find(u => u.name === value)

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>User combobox</Label>
      <Combobox id={id} items={users} value={value} onValueChange={v => setValue(v ?? '')}>
        <ComboboxInput placeholder='Select a user' avatarSrc={selectedUser?.avatar} fallback={selectedUser?.name[0]} />
        <ComboboxContent>
          <ComboboxEmpty>No users found.</ComboboxEmpty>
          <ComboboxList>
            {item => (
              <ComboboxItem key={item.name} value={item.name} className='flex items-center gap-2'>
                <Avatar className='size-7'>
                  <AvatarImage src={item.avatar} alt={item.name} />
                  <AvatarFallback>{item.name[0]}</AvatarFallback>
                </Avatar>
                <span className='flex flex-col'>
                  <span className='font-medium'>{item.name}</span>
                  <span className='text-muted-foreground text-sm'>{item.email}</span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxUserDemo
