'use client'

import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { GuitarIcon, HeadphonesIcon, MicVocalIcon, MusicIcon } from "lucide-react"

const genreIcons: Record<string, React.ReactNode> = {
  rock: (
    <GuitarIcon
    />
  ),
  electronic: (
    <HeadphonesIcon
    />
  ),
  pop: (
    <MicVocalIcon
    />
  ),
  jazz: (
    <MusicIcon
    />
  )
}

const items = [
  { label: 'Select a music genre', value: null },
  { label: 'Rock', value: 'rock' },
  { label: 'Electronic', value: 'electronic' },
  { label: 'Pop', value: 'pop' },
  { label: 'Jazz', value: 'jazz' }
]

const SelectDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Select option with icon</Label>
      <Select items={items} defaultValue='rock'>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue>
            {(value: string) => (
              <span className='flex items-center gap-2'>
                {genreIcons[value]}
                {items.find(i => i.value === value)?.label}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Music Genres</SelectLabel>
            {items.slice(1).map(item => {
              if (!item.value) return null

              return (
                <SelectItem key={item.value} value={item.value} className='*:items-center'>
                  {genreIcons[item.value]}
                  {item.label}
                </SelectItem>
              )
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectDemo
