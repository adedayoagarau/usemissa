import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

const ContextShortcutsDemo = () => {
  return (
    <ContextMenu>
      <div className='mt-4 flex w-full max-w-xs flex-col items-start gap-2'>
        <ContextMenuTrigger className='flex h-45 w-full items-center justify-center rounded-xl border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <div className='text-muted-foreground text-sm font-medium'>Menu with shortcuts</div>
      </div>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>
            New File
            <ContextMenuShortcut>⌘N</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Open
            <ContextMenuShortcut>⌘O</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Save
            <ContextMenuShortcut>⌘S</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem>
            Print
            <ContextMenuShortcut>⌘P</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            Close
            <ContextMenuShortcut>⌘W</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ContextShortcutsDemo
