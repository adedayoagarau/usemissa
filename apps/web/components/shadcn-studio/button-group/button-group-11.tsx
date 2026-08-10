'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ChevronDownIcon } from "lucide-react"

const options = [
  {
    label: 'Merge pull request',
    description: 'All commits from this branch will be added to the base branch via a commit version.'
  },
  {
    label: 'Squash and merge',
    description: 'The 6 commits from this branch will be combined into one commit in the base branch.'
  },
  {
    label: 'Rebase and merge',
    description: 'The 6 commits from this branch will be rebased and added to the base branch.'
  }
]

const ButtonGroupDropdownDemo = () => {
  const [selectedIndex, setSelectedIndex] = useState('0')

  return (
    <ButtonGroup className='*:border-primary *:not-last:border-r-primary-foreground/30 *:bg-clip-border'>
      <Button>{options[Number(selectedIndex)].label}</Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size='icon' />}>
          <ChevronDownIcon
          />
          <span className='sr-only'>Select option</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='bottom' sideOffset={4} align='end' className='w-full max-w-70'>
          <DropdownMenuRadioGroup value={selectedIndex} onValueChange={setSelectedIndex}>
            {options.map((option, index) => (
              <DropdownMenuRadioItem key={option.label} value={String(index)} className='items-start [&>span]:pt-1.5'>
                <div className='flex flex-col gap-1'>
                  <span className='text-sm font-medium'>{option.label}</span>
                  <span className='text-muted-foreground text-xs'>{option.description}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}

export default ButtonGroupDropdownDemo
