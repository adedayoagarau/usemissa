'use client'

import { useState } from 'react'

import { motion } from 'motion/react'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Toggle } from '@/components/ui/toggle'
import { BrainCircuitIcon, CodeIcon, Gamepad2Icon, DumbbellIcon, PinIcon } from "lucide-react"

const ListItem = [
  {
    id: '1',
    icon: (
      <BrainCircuitIcon
      />
    ),
    title: 'Brainstorming',
    description: 'Generate new ideas and solutions for next project',
    pinned: false
  },
  {
    id: '2',
    icon: (
      <CodeIcon
      />
    ),
    title: 'Coding',
    description: 'Write and maintain code for projects',
    pinned: false
  },
  {
    id: '3',
    icon: (
      <Gamepad2Icon
      />
    ),
    title: 'Gaming',
    description: 'Play and test games',
    pinned: false
  },
  {
    id: '4',
    icon: (
      <DumbbellIcon
      />
    ),
    title: 'Workout',
    description: 'Exercise and stay fit',
    pinned: false
  }
]

const PinList = () => {
  const [items, setItems] = useState(ListItem)

  const togglePin = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item => (item.id === id ? { ...item, pinned: !item.pinned } : item))

      const pinned = updated.filter(item => item.pinned)
      const unpinned = updated.filter(item => !item.pinned)

      return [...pinned, ...unpinned]
    })
  }

  return (
    <div className='flex flex-col items-center gap-4'>
      <div className='w-full max-w-sm'>
        <h4 className='mb-2 text-lg font-semibold'>All Tasks List</h4>
        <motion.div layout className='flex flex-col gap-4'>
          {items.map(item => (
            <motion.div
              key={item.id}
              layoutId={item.id}
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <Item variant='outline' className='group cursor-pointer' onClick={() => togglePin(item.id)}>
                <ItemMedia variant='icon' className='*:[svg]:size-4'>
                  {item.icon}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{item.title}</ItemTitle>
                  <ItemDescription>{item.description}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Toggle
                    pressed={item.pinned}
                    onPressedChange={() => togglePin(item.id)}
                    onClick={e => e.stopPropagation()}
                    aria-label='Toggle Pin'
                    variant='outline'
                    className={
                      item.pinned
                        ? 'translate-y-0 opacity-100 transition-all duration-200'
                        : 'translate-y-1 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100'
                    }
                  >
                    <PinIcon className={
                                                      item.pinned ? 'fill-foreground transition-all duration-200' : 'transition-all duration-200'
                                                    } />
                  </Toggle>
                </ItemActions>
              </Item>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <p className='text-muted-foreground text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://animate-ui.com/docs/components/community/pin-list'
          target='_blank'
          rel='noopener noreferrer'
        >
          Animate UI
        </a>
      </p>
    </div>
  )
}

export default PinList
