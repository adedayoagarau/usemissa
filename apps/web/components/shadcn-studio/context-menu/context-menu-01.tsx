import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

const ContextMenuDemo = () => {
  return (
    <ContextMenu>
      <div className='mt-4 flex w-full max-w-xs flex-col items-start gap-2'>
        <ContextMenuTrigger className='flex h-45 w-full items-center justify-center rounded-xl border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <div className='text-muted-foreground text-sm font-medium'>Menu with basic options</div>
      </div>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>Copy</ContextMenuItem>
          <ContextMenuItem>Paste</ContextMenuItem>
          <ContextMenuItem>Delete</ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ContextMenuDemo
