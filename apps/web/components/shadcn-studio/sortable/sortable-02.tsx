'use client'

import { useState } from 'react'

import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { GripVerticalIcon } from "lucide-react"

interface TeamMember {
  id: string
  name: string
  fallback: string
  src: string
}

const defaultMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Phillip George',
    fallback: 'PG',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png'
  },
  {
    id: '2',
    name: 'Jaylon Donin',
    fallback: 'JD',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png'
  },
  {
    id: '3',
    name: 'Tiana Curtis',
    fallback: 'TC',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png'
  },
  {
    id: '4',
    name: 'Zaire Vetrovs',
    fallback: 'ZV',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png'
  },
  {
    id: '5',
    name: 'Kianna Philips',
    fallback: 'KP',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png'
  },
  {
    id: '6',
    name: 'Santino Pratt',
    fallback: 'SP',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png'
  },
  {
    id: '7',
    name: 'Kiera Wallace',
    fallback: 'KW',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-7.png'
  },
  {
    id: '8',
    name: 'Damon Pierce',
    fallback: 'DP',
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-8.png'
  }
]

const SortableAvatarDemo = () => {
  const [members, setMembers] = useState<TeamMember[]>(defaultMembers)
  const [hovered, setHovered] = useState<string | null>(null)

  const handleValueChange = (newMembers: TeamMember[]) => {
    setMembers(newMembers)

    toast.success('Items reordered successfully!', {
      description: newMembers.map((member, index) => `${index + 1}. ${member.name}`).join(', ')
    })
  }

  return (
    <Card>
      <CardContent>
        <Sortable
          value={members}
          onValueChange={handleValueChange}
          getItemValue={member => member.id}
          strategy='horizontal'
          className='flex flex-wrap items-center gap-3'
        >
          {members.map(member => (
            <SortableItem key={member.id} value={member.id}>
              <div
                className='relative'
                onMouseEnter={() => setHovered(member.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(member.id)}
                onBlur={() => setHovered(null)}
              >
                <div className='flex flex-col items-center gap-2'>
                  <Avatar className='size-12 rounded-full'>
                    <AvatarImage src={member.src} alt={member.name} className='rounded-full' />
                    <AvatarFallback>{member.fallback}</AvatarFallback>
                  </Avatar>
                  <h4 className='text-muted-foreground truncate text-center text-sm'>{member.name}</h4>
                </div>
                <SortableItemHandle
                  className={
                    hovered === member.id
                      ? 'bg-background text-muted-foreground pointer-events-auto absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-full border p-1 opacity-100 shadow-xs transition-opacity'
                      : 'bg-background text-muted-foreground pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-full border p-1 opacity-0 shadow-xs transition-opacity'
                  }
                >
                  <GripVerticalIcon className='size-3' />
                </SortableItemHandle>
              </div>
            </SortableItem>
          ))}
        </Sortable>
      </CardContent>
    </Card>
  )
}

export default SortableAvatarDemo
