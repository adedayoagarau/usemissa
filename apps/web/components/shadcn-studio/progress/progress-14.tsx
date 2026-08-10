'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle2Icon, CircleIcon } from "lucide-react"

interface Checkpoint {
  id: string
  label: string
}

export interface ProgressChecklistProps {
  items?: Checkpoint[]
  defaultCompletedItems?: string[]
}

const DEFAULT_ITEMS: Checkpoint[] = [
  { id: 'ssl', label: 'Verify SSL certificates' },
  { id: 'assets', label: 'Optimize images and assets' },
  { id: 'seo', label: 'Update meta tags for SEO' },
  { id: 'analytics', label: 'Configure analytics tracking' },
  { id: 'testing', label: 'Test across browsers' }
]

const ProgressChecklistDemo = ({
  items = DEFAULT_ITEMS,
  defaultCompletedItems = ['ssl', 'assets']
}: ProgressChecklistProps) => {
  const [completedItems, setCompletedItems] = useState<string[]>(defaultCompletedItems)

  const toggleItem = (id: string) => {
    setCompletedItems(prev => (prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]))
  }

  const validCompletedItems = completedItems.filter(id => items.some(item => item.id === id))

  const progress = items.length > 0 ? (validCompletedItems.length / items.length) * 100 : 0

  return (
    <div className='flex w-full flex-col gap-6'>
      <Progress id='go-live-progress' value={progress} className='*:data-[slot=progress-track]:h-2'>
        <ProgressLabel className='text-sm font-medium'>Go-Live Checklist</ProgressLabel>
        <ProgressValue className='text-muted-foreground text-sm'>
          {() => `${validCompletedItems.length} / ${items.length} checks`}
        </ProgressValue>
      </Progress>

      <div className='flex flex-col gap-2'>
        {items.map(item => {
          const isCompleted = validCompletedItems.includes(item.id)

          return (
            <Button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              variant='ghost'
              className={cn(
                'group hover:text-foreground flex items-center justify-start gap-3 text-sm transition-colors outline-none hover:bg-transparent',
                isCompleted ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <div className='relative flex h-4 w-4 shrink-0 items-center justify-center'>
                {isCompleted ? (
                  <CheckCircle2Icon className='h-4 w-4 text-green-600 dark:text-green-400' />
                ) : (
                  <CircleIcon className='group-hover:text-foreground h-4 w-4 transition-colors' />
                )}
              </div>
              <span>{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressChecklistDemo
