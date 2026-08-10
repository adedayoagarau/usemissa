'use client'

import { useState } from 'react'

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

const ContextCheckboxRadioDemo = () => {
  const [showBookmarksBar, setShowBookmarksBar] = useState(true)
  const [showFullUrls, setShowFullUrls] = useState(false)
  const [showDeveloperTools, setShowDeveloperTools] = useState(true)
  const [theme, setTheme] = useState('compact')

  return (
    <ContextMenu>
      <div className='mt-4 flex w-full max-w-xs flex-col items-start gap-2'>
        <ContextMenuTrigger className='flex h-45 w-full items-center justify-center rounded-xl border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <div className='text-muted-foreground text-sm font-medium'>Menu with checkboxes and radio items</div>
      </div>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuCheckboxItem checked={showBookmarksBar} onCheckedChange={setShowBookmarksBar}>
            Show Grid
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={showFullUrls} onCheckedChange={setShowFullUrls}>
            Show Hidden Files
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={showDeveloperTools} onCheckedChange={setShowDeveloperTools}>
            Enable Autosave
          </ContextMenuCheckboxItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Layout</ContextMenuLabel>
          <ContextMenuRadioGroup value={theme} onValueChange={setTheme}>
            <ContextMenuRadioItem value='compact'>Compact</ContextMenuRadioItem>
            <ContextMenuRadioItem value='comfortable'>Comfortable</ContextMenuRadioItem>
            <ContextMenuRadioItem value='spacious'>Spacious</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ContextCheckboxRadioDemo
