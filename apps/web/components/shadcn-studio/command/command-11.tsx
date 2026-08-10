'use client'

import * as React from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SlidersHorizontalIcon } from "lucide-react"

const marketingBlocks = [
  { id: 'announcements', label: 'Announcements', count: 10 },
  { id: 'backgrounds', label: 'Backgrounds', count: 33 },
  { id: 'borders', label: 'Borders', count: 12 },
  { id: 'calls-to-action', label: 'Calls to Action', count: 34 },
  { id: 'clients', label: 'Clients', count: 16 },
  { id: 'comparisons', label: 'Comparisons', count: 6 },
  { id: 'docks', label: 'Docks', count: 7 },
  { id: 'features', label: 'Features', count: 36 },
  { id: 'footers', label: 'Footers', count: 14 },
  { id: 'heroes', label: 'Heroes', count: 73 }
]

const uiComponents = [
  { id: 'accordions', label: 'Accordions', count: 40 },
  { id: 'ai-chats', label: 'AI Chats', count: 30 },
  { id: 'alerts', label: 'Alerts', count: 23 },
  { id: 'avatars', label: 'Avatars', count: 17 },
  { id: 'badges', label: 'Badges', count: 25 }
]

const CommandFilterSearch = () => {
  const [open, setOpen] = React.useState(false)
  const [checked, setChecked] = React.useState<Record<string, boolean>>({})
  const [category, setCategory] = React.useState('all')
  const [sort, setSort] = React.useState('recommended')
  const [time, setTime] = React.useState('all-time')

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className='flex flex-col gap-4'>
      <Button onClick={() => setOpen(true)} variant='outline' className='w-40 justify-start gap-2'>
        <SlidersHorizontalIcon className='size-4' />
        Search & Filter
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className='flex flex-col overflow-hidden'>
          <CommandInput placeholder='Search...' />

          <CommandList className='flex-1 overflow-y-auto'>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Category */}
            <CommandGroup heading='Category'>
              <RadioGroup value={category} onValueChange={setCategory} className='gap-0 px-2'>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'marketing-blocks', label: 'Marketing Blocks' },
                  { value: 'ui-components', label: 'UI Components' }
                ].map(({ value, label }) => (
                  <div
                    key={value}
                    className='hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5'
                  >
                    <RadioGroupItem value={value} id={`category-${value}`} />
                    <Label htmlFor={`category-${value}`} className='cursor-pointer text-sm font-normal'>
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CommandGroup>
            <CommandSeparator />

            {/* Sort */}
            <CommandGroup heading='Sort'>
              <RadioGroup value={sort} onValueChange={setSort} className='gap-0 px-2'>
                {[
                  { value: 'recommended', label: 'Recommended' },
                  { value: 'most-downloaded', label: 'Most downloaded' },
                  { value: 'most-bookmarked', label: 'Most bookmarked' },
                  { value: 'newest', label: 'Newest' }
                ].map(({ value, label }) => (
                  <div
                    key={value}
                    className='hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5'
                  >
                    <RadioGroupItem value={value} id={`sort-${value}`} />
                    <Label htmlFor={`sort-${value}`} className='cursor-pointer text-sm font-normal'>
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CommandGroup>
            <CommandSeparator />

            {/* Time */}
            <CommandGroup heading='Time'>
              <RadioGroup value={time} onValueChange={setTime} className='gap-0 px-2'>
                {[
                  { value: 'all-time', label: 'All time' },
                  { value: 'last-week', label: 'Last week' },
                  { value: 'last-month', label: 'Last month' },
                  { value: 'last-3-months', label: 'Last 3 months' },
                  { value: 'last-year', label: 'Last year' }
                ].map(({ value, label }) => (
                  <div
                    key={value}
                    className='hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5'
                  >
                    <RadioGroupItem value={value} id={`time-${value}`} />
                    <Label htmlFor={`time-${value}`} className='cursor-pointer text-sm font-normal'>
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CommandGroup>
            <CommandSeparator />

            {/* Marketing Blocks */}
            <CommandGroup heading='Marketing Blocks'>
              {marketingBlocks.map(({ id, label, count }) => (
                <CommandItem key={id} onSelect={() => toggle(id)} className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      checked={!!checked[id]}
                      onCheckedChange={() => toggle(id)}
                      onPointerDown={e => e.stopPropagation()}
                    />
                    <span>{label}</span>
                  </div>
                  <span className='text-muted-foreground text-xs'>{count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='UI Components'>
              {uiComponents.map(({ id, label, count }) => (
                <CommandItem key={id} onSelect={() => toggle(id)} className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      checked={!!checked[id]}
                      onCheckedChange={() => toggle(id)}
                      onPointerDown={e => e.stopPropagation()}
                    />
                    <span>{label}</span>
                  </div>
                  <span className='text-muted-foreground text-xs'>{count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

export default CommandFilterSearch
