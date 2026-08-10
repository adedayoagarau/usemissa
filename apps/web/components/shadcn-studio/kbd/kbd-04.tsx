'use client'

import { useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { SearchIcon } from "lucide-react"

const KbdInputDemo = () => {
  const [checked, setChecked] = useState(true)

  const toggleSwitch = () => setChecked(prev => !prev)

  return (
    <div className='flex w-full max-w-xs flex-col gap-4'>
      <div className='group inline-flex items-center gap-2' data-state={checked ? 'checked' : 'unchecked'}>
        <span
          id='windows'
          className='group-data-checked:text-muted-foreground cursor-pointer text-left text-sm font-medium'
          aria-controls='windows'
          onClick={() => setChecked(false)}
        >
          Windows
        </span>
        <Switch
          id='switch-os'
          checked={checked}
          onCheckedChange={toggleSwitch}
          aria-label='Toggle between macOS and Windows'
        />
        <span
          id='mac'
          className='group-data-unchecked:text-muted-foreground cursor-pointer text-right text-sm font-medium'
          aria-controls='mac'
          onClick={() => setChecked(true)}
        >
          macOS
        </span>
      </div>

      <InputGroup>
        <InputGroupInput placeholder='Search...' />
        <InputGroupAddon>
          <SearchIcon
          />
        </InputGroupAddon>
        <InputGroupAddon align='inline-end'>
          <Kbd>{checked ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>{checked ? 'p' : 'p'}</Kbd>
        </InputGroupAddon>
      </InputGroup>

      <div className='flex flex-col items-center justify-center gap-2'>
        <div className='flex w-full items-center justify-start gap-2'>
          <p className='font-medium'>Quick Actions</p>
          <div className='bg-muted inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs'>
            <KbdGroup>
              <Kbd>{checked ? '⌘' : 'Ctrl'}</Kbd>
              <Separator orientation='vertical' className='text-muted-foreground -my-1' />
              <Kbd>{checked ? 'p' : 'p'}</Kbd>
            </KbdGroup>
          </div>
          <div className='bg-muted inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs'>
            <KbdGroup>
              <Kbd>{checked ? '⌘' : 'Ctrl'}</Kbd>
              <Separator orientation='vertical' className='text-muted-foreground -my-1' />
              <Kbd>Shift</Kbd>
              <Separator orientation='vertical' className='text-muted-foreground -my-1' />
              <Kbd>p</Kbd>
            </KbdGroup>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KbdInputDemo
