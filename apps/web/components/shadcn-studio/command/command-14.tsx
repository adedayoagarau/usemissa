'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'

const CommandZoomIn = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className='flex flex-col gap-4'>
      <Button onClick={() => setOpen(true)} variant='outline' className='w-fit'>
        Zoom In
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className='data-open:zoom-in-0! data-open:duration-600 sm:max-w-106.25'
      >
        <Command>
          <CommandInput placeholder='Type a command or search...' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading='Suggestions'>
              <CommandItem>Calendar</CommandItem>
              <CommandItem>Search Emoji</CommandItem>
              <CommandItem>Calculator</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

export default CommandZoomIn
