'use client'

import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const items = [
  {
    id: '1',
    name: 'Hallie Richards',
    role: 'Product Manager',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    initials: 'HR'
  },
  {
    id: '2',
    name: 'Romario Shepherd',
    role: 'Design Engineer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    initials: 'RS'
  },
  {
    id: '3',
    name: 'Harry Brook',
    role: 'UI/UX Designer',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-9.png',
    initials: 'HB'
  }
]

const ListUsers = () => {
  const [followed, setFollowed] = useState<Record<string, boolean>>({})

  const toggleFollow = (id: string) => {
    setFollowed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className='w-full max-w-sm space-y-2'>
      {items.map((item, idx) => (
        <div key={item.id} className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='flex gap-2'>
              <Avatar className='ring-ring ring-2'>
                <AvatarImage src={item.avatar} alt={item.name} />
                <AvatarFallback className='text-xs'>{item.initials}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className='text-sm font-medium'>{item.name}</h4>
                <p className='text-muted-foreground text-xs'>{item.role}</p>
              </div>
            </div>
            <Button variant={followed[item.id] ? 'outline' : undefined} onClick={() => toggleFollow(item.id)}>
              {followed[item.id] ? 'Unfollow' : 'Follow'}
            </Button>
          </div>
          {idx < items.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  )
}

export default ListUsers
