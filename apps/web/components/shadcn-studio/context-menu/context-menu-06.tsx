import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { CopyIcon, ScissorsIcon, ClipboardPasteIcon, TrashIcon } from "lucide-react"

const ContextIconsDemo = () => {
  return (
    <ContextMenu>
      <div className='mt-4 flex w-full max-w-xs flex-col items-start gap-2'>
        <ContextMenuTrigger className='flex h-45 w-full items-center justify-center rounded-xl border border-dashed text-sm'>
          Right click here
        </ContextMenuTrigger>
        <div className='text-muted-foreground text-sm font-medium'>Menu with icons</div>
      </div>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>
            <CopyIcon
            />
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem>
            <ScissorsIcon
            />
            Rename
          </ContextMenuItem>
          <ContextMenuItem>
            <ClipboardPasteIcon
            />
            Move to Folder
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem variant='destructive'>
            <TrashIcon
            />
            Remove from Library
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ContextIconsDemo
