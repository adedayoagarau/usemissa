'use client'

import { useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/motion-toggle-group'
import { SunMediumIcon, MoonIcon, LaptopMinimalIcon } from "lucide-react"

const ToggleGroupTheme = () => {
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('light')

  return (
    <ToggleGroup
      type='single'
      defaultValue={[mode]}
      className='bg-primary/10 overflow-hidden rounded-full p-0.5'
      spacing={0}
    >
      <ToggleGroupItem
        value='light'
        aria-label='Toggle light'
        className='h-6 min-w-8 group-data-[spacing=0]/toggle-group:px-0.5'
        motionProps={{
          className:
            '[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full'
        }}
        onClick={() => setMode('light')}
      >
        <SunMediumIcon className='text-primary size-4' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='dark'
        aria-label='Toggle dark'
        className='h-6 min-w-8 group-data-[spacing=0]/toggle-group:px-0.5'
        motionProps={{
          className:
            '[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full'
        }}
        onClick={() => setMode('dark')}
      >
        <MoonIcon className='text-primary size-4' />
      </ToggleGroupItem>
      <ToggleGroupItem
        value='system'
        aria-label='Toggle system'
        className='h-6 min-w-8 group-data-[spacing=0]/toggle-group:px-0.5'
        motionProps={{
          className:
            '[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground [&_[data-slot=active-toggle-group-item]]:!rounded-full'
        }}
        onClick={() => setMode('system')}
      >
        <LaptopMinimalIcon className='text-primary size-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export default ToggleGroupTheme
