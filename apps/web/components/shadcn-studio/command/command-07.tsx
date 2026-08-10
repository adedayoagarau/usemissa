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
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command'
import { FileIcon } from "lucide-react"

const files = [
  { name: 'page.tsx', path: 'src/app/page.tsx' },
  { name: 'package.json', path: 'package.json' },
  { name: 'globals.css', path: 'src/styles/globals.css' },
  { name: 'utils.ts', path: 'src/lib/utils.ts' },
  { name: 'layout.tsx', path: 'src/app/layout.tsx' },
  { name: 'README.md', path: 'README.md' },
  { name: 'api.ts', path: 'src/lib/api.ts' },
  { name: 'button.tsx', path: 'src/components/ui/button.tsx' }
]

const CommandPalette = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className='flex flex-col gap-4'>
      <Button onClick={() => setOpen(true)} variant='outline' className='w-fit'>
        Command Palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder='Type a command or search...' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading='Actions'>
              <CommandItem>
                <span>Go to file</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <span>Show and Run commands</span>
                <CommandShortcut>⇧⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <span>Open Quick Chat</span>
                <CommandShortcut>⇧⌘L</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <span>Git: clone</span>
                <CommandShortcut>^⌘I</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Files'>
              {files.map(file => (
                <CommandItem key={file.path} className='gap-2.5'>
                  <FileIcon className='size-4 shrink-0' />
                  <div className='flex flex-1 items-center gap-2'>
                    <span className='font-medium'>{file.name}</span>
                    <span className='text-muted-foreground truncate text-xs'>{file.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

export default CommandPalette
