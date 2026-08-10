'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'

import { Switch } from '@/components/ui/switch'
import { GripVerticalIcon } from "lucide-react"

interface NotificationChannel {
  id: string
  name: string
  description: string
  enabled: boolean
}

const defaultChannels: NotificationChannel[] = [
  {
    id: '1',
    name: 'Email',
    description: 'Send notifications via email',
    enabled: true
  },
  {
    id: '2',
    name: 'Github',
    description: 'Notify when new issues are created',
    enabled: true
  },
  { id: '3', name: 'Intercom', description: 'Text message alerts', enabled: false },
  {
    id: '4',
    name: 'Slack',
    description: 'Post to Slack channels',
    enabled: true
  },
  {
    id: '5',
    name: 'Vercel',
    description: 'Notify when new deployments get failed',
    enabled: false
  }
]

const SortableNotificationChannels = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>(defaultChannels)

  const toggleChannel = (id: string) => {
    setChannels(prev => prev.map(ch => (ch.id === id ? { ...ch, enabled: !ch.enabled } : ch)))
  }

  return (
    <div className='mx-auto w-full max-w-md'>
      <Card>
        <CardHeader>
          <CardTitle>Notification Priority</CardTitle>
          <CardDescription>Drag to reorder by priority. Top channels are tried first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Sortable
            value={channels}
            onValueChange={setChannels}
            getItemValue={item => item.id}
            strategy='vertical'
            className='space-y-3'
          >
            {channels.map(channel => (
              <SortableItem key={channel.id} value={channel.id}>
                <Card className='cursor-default p-0!'>
                  <CardContent className='flex items-center gap-3 px-3 py-2.5'>
                    <SortableItemHandle className='text-muted-foreground hover:text-foreground'>
                      <GripVerticalIcon className='size-4' />
                    </SortableItemHandle>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium'>{channel.name}</p>
                      <p className='text-muted-foreground text-xs'>{channel.description}</p>
                    </div>
                    <Switch checked={channel.enabled} onCheckedChange={() => toggleChannel(channel.id)} />
                  </CardContent>
                </Card>
              </SortableItem>
            ))}
          </Sortable>
        </CardContent>
      </Card>
    </div>
  )
}

export default SortableNotificationChannels
