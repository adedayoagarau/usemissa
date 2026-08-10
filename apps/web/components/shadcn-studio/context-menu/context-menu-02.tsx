import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

const ContextSubMenuDemo = () => {
  return (
    <ContextMenu>
      <div className='mt-4 flex w-full max-w-xs flex-col items-start gap-2'>
        <ContextMenuTrigger className='flex h-45 w-full items-center justify-center rounded-xl border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <div className='text-muted-foreground text-sm font-medium'>Menu with submenu</div>
      </div>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>Copy</ContextMenuItem>
          <ContextMenuItem>Cut</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSub>
          <ContextMenuSubTrigger>More Options</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuGroup>
              <ContextMenuItem>Save File</ContextMenuItem>
              <ContextMenuItem>Create Folder</ContextMenuItem>
              <ContextMenuItem>View Details</ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ContextSubMenuDemo
