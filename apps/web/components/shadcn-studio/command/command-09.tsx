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
import { SearchIcon, GitBranchIcon, GitCommitHorizontalIcon, GitPullRequestIcon, PlayIcon, SquareTerminalIcon, BugIcon, RocketIcon, CloudUploadIcon, EyeIcon } from "lucide-react"

const CommandDev = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className='flex flex-col gap-4'>
      <Button onClick={() => setOpen(true)} variant='outline' size='icon'>
        <SearchIcon
        />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder='Type a command or search...' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading='Code'>
              <CommandItem>
                <GitBranchIcon
                />
                <span>New Branch</span>
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <GitCommitHorizontalIcon
                />
                <span>Commit Changes</span>
                <CommandShortcut>⌘⇧C</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <GitPullRequestIcon
                />
                <span>Open Pull Request</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Run'>
              <CommandItem>
                <PlayIcon
                />
                <span>Run Project</span>
                <CommandShortcut>⌘R</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <SquareTerminalIcon
                />
                <span>Open Terminal</span>
                <CommandShortcut>⌘`</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <BugIcon
                />
                <span>Start Debugger</span>
                <CommandShortcut>⌘⇧D</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Deploy'>
              <CommandItem>
                <RocketIcon
                />
                <span>Deploy to Production</span>
                <CommandShortcut>⌘⇧P</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <CloudUploadIcon
                />
                <span>Push to Staging</span>
                <CommandShortcut>⌘⇧S</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <EyeIcon
                />
                <span>Preview Build</span>
                <CommandShortcut>⌘⇧V</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

export default CommandDev
