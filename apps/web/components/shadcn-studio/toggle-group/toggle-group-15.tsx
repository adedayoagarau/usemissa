'use client'

import { useState } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/motion-toggle-group'

const ToggleGroupPackage = () => {
  const [packageManager, setPackageManager] = useState<'npm' | 'yarn' | 'pnpm'>('npm')

  return (
    <ToggleGroup
      type='single'
      defaultValue={[packageManager]}
      spacing={0}
      className='bg-primary/10 w-full max-w-md justify-between rounded-lg p-0.5'
    >
      <ToggleGroupItem
        value='npm'
        aria-label='Toggle npm'
        className='h-7 min-w-7 flex-1 group-data-[spacing=0]/toggle-group:px-0.5'
        motionProps={{
          className: '[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground rounded-lg'
        }}
        onClick={() => setPackageManager('npm')}
      >
        npm
      </ToggleGroupItem>
      <ToggleGroupItem
        value='yarn'
        aria-label='Toggle yarn'
        className='h-7 min-w-7 flex-1 group-data-[spacing=0]/toggle-group:px-0.5'
        motionProps={{
          className: '[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground rounded-lg'
        }}
        onClick={() => setPackageManager('yarn')}
      >
        yarn
      </ToggleGroupItem>
      <ToggleGroupItem
        value='pnpm'
        aria-label='Toggle pnpm'
        className='h-7 min-w-7 flex-1 group-data-[spacing=0]/toggle-group:px-0.5'
        motionProps={{
          className: '[&_[data-slot=active-toggle-group-item]]:bg-background text-foreground rounded-lg'
        }}
        onClick={() => setPackageManager('pnpm')}
      >
        pnpm
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export default ToggleGroupPackage
