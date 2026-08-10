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
  CommandSeparator
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { SearchIcon, SparkleIcon, ComponentIcon, BlocksIcon, LayoutTemplateIcon, PaletteIcon, ClockIcon, BookOpenIcon, LifeBuoyIcon, MessageSquareIcon, Undo2Icon, ArrowUpIcon, ArrowDownIcon } from "lucide-react"

const CommandSearch = () => {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'j' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(open => !open)
      }
    }

    document.addEventListener('keydown', down)

    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <div className='flex flex-col gap-4'>
      <Button onClick={() => setOpen(true)} variant='outline' className='w-52'>
        <SearchIcon className='size-4' />
        Search files...
        <Kbd className='ml-auto'>⌘J</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} className='w-full max-w-lg!'>
        <Command>
          <CommandInput placeholder='Type a command or search...' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading='Suggestions'>
              <CommandItem>
                <SparkleIcon
                />
                <span>Introduction</span>
              </CommandItem>
              <CommandItem>
                <ComponentIcon
                />
                <span>Components</span>
              </CommandItem>
              <CommandItem>
                <BlocksIcon
                />
                <span>Blocks</span>
              </CommandItem>
              <CommandItem>
                <LayoutTemplateIcon
                />
                <span>Templates</span>
              </CommandItem>
              <CommandItem>
                <PaletteIcon
                />
                <span>Theme Generator</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Recent'>
              <CommandItem>
                <ClockIcon className='text-muted-foreground' />
                <span>Dashboard Analytics</span>
                <div className='ml-auto' data-slot='command-shortcut'>
                  <span>2m ago</span>
                </div>
              </CommandItem>
              <CommandItem>
                <ClockIcon className='text-muted-foreground' />
                <span>User Settings</span>
                <div className='ml-auto' data-slot='command-shortcut'>
                  <span>15m ago</span>
                </div>
              </CommandItem>
              <CommandItem>
                <ClockIcon className='text-muted-foreground' />
                <div className='flex flex-1 items-center justify-between'>
                  <span>Team Members</span>
                  <div className='ml-auto' data-slot='command-shortcut'>
                    <span>1h ago</span>
                  </div>
                </div>
              </CommandItem>
              <CommandItem>
                <ClockIcon className='text-muted-foreground' />
                <span>Billing & Plans</span>
                <div className='ml-auto' data-slot='command-shortcut'>
                  <span>2h ago</span>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Quick Links'>
              <CommandItem>
                <BookOpenIcon
                />
                <span>Documentation</span>
              </CommandItem>
              <CommandItem>
                <LifeBuoyIcon
                />
                <span>Help & Support</span>
              </CommandItem>
              <CommandItem>
                <MessageSquareIcon
                />
                <span>Contact Us</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <div className='text-muted-foreground flex flex-wrap items-center gap-4 p-4'>
            <div className='flex flex-1 items-center gap-2'>
              <kbd className='rounded border px-1 text-sm'>esc</kbd>
              <span>To close</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex size-5 items-center justify-center rounded border'>
                <Undo2Icon className='size-4' />
              </div>
              <span>To Select</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex size-5 items-center justify-center rounded border'>
                <ArrowUpIcon className='size-4' />
              </div>
              <div className='flex size-5 items-center justify-center rounded border'>
                <ArrowDownIcon className='size-4' />
              </div>
              <span>To Navigate</span>
            </div>
          </div>
        </Command>
      </CommandDialog>
    </div>
  )
}

export default CommandSearch
