'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { PlusIcon } from "lucide-react"

const teamLeads = [
  {
    name: 'Alice Carter',
    email: 'alice.carter@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    fallback: 'AC'
  },
  {
    name: 'Marcus Webb',
    email: 'marcus.webb@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    fallback: 'MW'
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    fallback: 'PS'
  },
  {
    name: 'Liam Nguyen',
    email: 'liam.nguyen@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png',
    fallback: 'LN'
  }
]

const developers = [
  {
    name: 'Sofia Reyes',
    email: 'sofia.reyes@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    fallback: 'SR'
  },
  {
    name: 'Ethan Brooks',
    email: 'ethan.brooks@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    fallback: 'EB'
  },
  {
    name: 'Nadia Kowalski',
    email: 'nadia.kowalski@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-7.png',
    fallback: 'NK'
  },
  {
    name: 'James Park',
    email: 'james.park@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-8.png',
    fallback: 'JP'
  }
]

const designers = [
  {
    name: 'Liam Carter',
    email: 'liam.carter@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-9.png',
    fallback: 'LC'
  },
  {
    name: 'Ava Mitchell',
    email: 'ava.mitchell@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-10.png',
    fallback: 'AM'
  },
  {
    name: 'Noah Bennett',
    email: 'noah.bennett@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-11.png',
    fallback: 'NB'
  },
  {
    name: 'Isabella Nguyen',
    email: 'isabella.nguyen@company.com',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-12.png',
    fallback: 'IN'
  }
]

const CommandMembers = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className='flex flex-col gap-4'>
      <Button onClick={() => setOpen(true)} variant='outline' className='w-fit'>
        Invite Members
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder='Type a command or search...' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading='Team Leads'>
              {teamLeads.map(member => (
                <CommandItem key={member.email} className='gap-2 py-2'>
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className='text-xs'>{member.fallback}</AvatarFallback>
                  </Avatar>
                  <div className='flex flex-1 flex-col'>
                    <span className='text-sm font-medium'>{member.name}</span>
                    <span className='text-muted-foreground text-xs'>{member.email}</span>
                  </div>
                  <div className='ml-auto' data-slot='command-shortcut'>
                    <Button size='sm'>
                      <PlusIcon
                      />{' '}
                      Invite
                    </Button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Developers'>
              {developers.map(member => (
                <CommandItem key={member.email} className='gap-2 py-2'>
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className='text-xs'>{member.fallback}</AvatarFallback>
                  </Avatar>
                  <div className='flex flex-1 flex-col'>
                    <span className='text-sm font-medium'>{member.name}</span>
                    <span className='text-muted-foreground text-xs'>{member.email}</span>
                  </div>
                  <div className='ml-auto' data-slot='command-shortcut'>
                    <Button size='sm'>
                      <PlusIcon
                      />{' '}
                      Invite
                    </Button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Designers'>
              {designers.map(member => (
                <CommandItem key={member.email} className='gap-2 py-2'>
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className='text-xs'>{member.fallback}</AvatarFallback>
                  </Avatar>
                  <div className='flex flex-1 flex-col'>
                    <span className='text-sm font-medium'>{member.name}</span>
                    <span className='text-muted-foreground text-xs'>{member.email}</span>
                  </div>
                  <div className='ml-auto' data-slot='command-shortcut'>
                    <Button size='sm'>
                      <PlusIcon
                      />{' '}
                      Invite
                    </Button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

export default CommandMembers
