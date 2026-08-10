'use client'

import { useState } from 'react'

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

const ContextMenuDemo = () => {
  const [showPreview, setShowPreview] = useState(true)
  const [showHiddenFiles, setShowHiddenFiles] = useState(false)
  const [enableAutosave, setEnableAutosave] = useState(false)
  const [sortBy, setSortBy] = useState('name')

  return (
    <ContextMenu>
      <div className='mt-4 flex w-full max-w-xs flex-col items-start gap-2'>
        <ContextMenuTrigger className='flex h-45 w-full items-center justify-center rounded-xl border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <div className='text-muted-foreground text-sm font-medium'>Menu with all features combined</div>
      </div>
      <ContextMenuContent className='w-56'>
        <ContextMenuGroup>
          <ContextMenuItem>
            Open
            <ContextMenuShortcut>⌘O</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled>
            Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Download
            <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>More Actions</ContextMenuSubTrigger>
            <ContextMenuSubContent className='w-44'>
              <ContextMenuGroup>
                <ContextMenuItem>Export as PDF...</ContextMenuItem>
                <ContextMenuItem>Create Shortcut...</ContextMenuItem>
                <ContextMenuItem>Manage Versions...</ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuItem>Permissions</ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuItem variant='destructive'>Remove</ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuCheckboxItem checked={showPreview} onCheckedChange={setShowPreview}>
            Show Preview
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={showHiddenFiles} onCheckedChange={setShowHiddenFiles}>
            Show Hidden Files
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={enableAutosave} onCheckedChange={setEnableAutosave}>
            Enable Autosave
          </ContextMenuCheckboxItem>
        </ContextMenuGroup>

        <ContextMenuSeparator />

        <ContextMenuGroup>
          <ContextMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
            <ContextMenuLabel>Sort By</ContextMenuLabel>
            <ContextMenuRadioItem value='name'>Name</ContextMenuRadioItem>
            <ContextMenuRadioItem value='date'>Date Modified</ContextMenuRadioItem>
            <ContextMenuRadioItem value='size'>Size</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ContextMenuDemo
