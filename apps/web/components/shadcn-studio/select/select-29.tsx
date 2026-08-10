'use client'

import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  '1': 'bg-violet-500',
  '2': 'bg-amber-500',
  '3': 'bg-emerald-600',
  '4': 'bg-gray-500',
  '5': 'bg-red-500'
}

const statusLabels: Record<string, string> = {
  '1': 'In Progress',
  '2': 'Pending',
  '3': 'Completed',
  '4': 'Cancelled',
  '5': 'Rejected'
}

const items = [
  { label: 'Select status', value: null },
  { label: 'In Progress', value: '1' },
  { label: 'Pending', value: '2' },
  { label: 'Completed', value: '3' },
  { label: 'Cancelled', value: '4' },
  { label: 'Rejected', value: '5' }
]

const SelectStatusDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Status select</Label>
      <Select items={items} defaultValue='1'>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue>
            {(value: string) => (
              <span className='flex items-center gap-1.5'>
                <span className={cn('block size-2 rounded-full', statusColors[value])}></span>
                <span className='truncate'>{statusLabels[value]}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className='p-1'>
          {items.slice(1).map(item => {
            if (!item.value) return null

            return (
              <SelectItem key={item.value} value={item.value}>
                <span className='flex items-center gap-1.5'>
                  <span className={cn('block size-2 rounded-full', statusColors[item.value])}></span>
                  <span className='truncate'>{item.label}</span>
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectStatusDemo
