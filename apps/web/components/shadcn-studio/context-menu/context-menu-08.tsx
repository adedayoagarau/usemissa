import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { CopyIcon, ClipboardPasteIcon, ScissorsIcon, TrashIcon } from "lucide-react"

const ContextSheetDemo = () => {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant='outline' />}>File Actions</SheetTrigger>
      <SheetContent className='p-6' side='top'>
        <div className='mx-auto max-w-lg'>
          <SheetTitle className='text-lg font-medium'>Document : Project Plan.md</SheetTitle>
          <p className='text-muted-foreground mb-4 text-sm'>Size: 42 KB · Modified: 2 days ago</p>

          <ContextMenu>
            <div className='flex w-full flex-col items-start gap-2'>
              <ContextMenuTrigger className='flex h-30 w-full items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-sm'>
                <div>
                  <div className='font-medium'>Project Plan.md</div>
                  <div className='text-muted-foreground text-xs'>Right click for actions</div>
                </div>
              </ContextMenuTrigger>
              <div className='text-muted-foreground text-sm font-medium'>Menu inside a sheet</div>
            </div>

            <ContextMenuContent>
              <ContextMenuGroup>
                <ContextMenuItem>
                  <CopyIcon
                  />
                  Duplicate
                </ContextMenuItem>
                <ContextMenuItem>
                  <ClipboardPasteIcon
                  />
                  Download
                </ContextMenuItem>
                <ContextMenuItem>
                  <ScissorsIcon
                  />
                  Move to Folder
                </ContextMenuItem>
              </ContextMenuGroup>

              <ContextMenuSeparator />

              <ContextMenuGroup>
                <ContextMenuItem>
                  <CopyIcon
                  />
                  Share Link
                </ContextMenuItem>
                <ContextMenuItem>
                  <ClipboardPasteIcon
                  />
                  Open in New Tab
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
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ContextSheetDemo
