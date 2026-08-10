'use client'

import { useState } from 'react'

import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { ImageIcon, FileTextIcon, VideoIcon, MusicIcon, GripVerticalIcon } from "lucide-react"

interface SortableItem {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  type: 'image' | 'document' | 'audio' | 'video'
}

const defaultItems: SortableItem[] = [
  {
    id: '1',
    icon: (
      <ImageIcon
      />
    ),
    title: 'Product Demo',
    description: 'Main product image',
    type: 'image'
  },
  {
    id: '2',
    icon: (
      <FileTextIcon
      />
    ),
    title: 'Product Specification',
    description: 'Technical details document',
    type: 'document'
  },
  {
    id: '3',
    icon: (
      <VideoIcon
      />
    ),
    title: 'Product Demo Video',
    description: 'How to use the product',
    type: 'video'
  },
  {
    id: '4',
    icon: (
      <MusicIcon
      />
    ),
    title: 'Product Audio Guide',
    description: 'Audio instructions',
    type: 'audio'
  },
  {
    id: '5',
    icon: (
      <ImageIcon
      />
    ),
    title: 'Product Specification',
    description: 'Additional product view',
    type: 'image'
  }
]

const SortableDemo = () => {
  const [items, setItems] = useState<SortableItem[]>(defaultItems)

  const handleValueChange = (newItems: SortableItem[]) => {
    setItems(newItems)

    // Show toast with new order
    toast.success('Items reordered successfully!', {
      description: newItems.map((item, index) => `${index + 1}. ${item.title}`).join(', ')
    })
  }

  const getItemValue = (item: SortableItem) => item.id

  return (
    <div className='space-y-4'>
      <Sortable
        value={items}
        onValueChange={handleValueChange}
        getItemValue={getItemValue}
        strategy='vertical'
        className='space-y-2'
      >
        {items.map(item => (
          <SortableItem key={item.id} value={item.id}>
            <Card>
              <CardContent className='flex cursor-pointer items-center gap-3' onClick={() => {}}>
                <SortableItemHandle className='text-muted-foreground hover:text-foreground'>
                  <GripVerticalIcon className='size-4' />
                </SortableItemHandle>
                <div className='text-muted-foreground'>{item.icon}</div>
                <div className='flex-1'>
                  <h4 className='truncate'>{item.title}</h4>
                  <p className='text-muted-foreground truncate text-sm'>{item.description}</p>
                </div>
                <div className='flex items-center gap-2 max-sm:hidden'>
                  <Badge variant='outline'>{item.type}</Badge>
                </div>
              </CardContent>
            </Card>
          </SortableItem>
        ))}
      </Sortable>
      <p className='text-muted-foreground text-center text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://reui.io/components/sortable'
          target='_blank'
          rel='noopener noreferrer'
        >
          ReUI
        </a>
      </p>
    </div>
  )
}

export default SortableDemo
