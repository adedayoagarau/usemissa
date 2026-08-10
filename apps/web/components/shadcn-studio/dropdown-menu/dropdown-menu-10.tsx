import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const DropdownMenuAlignEndDemo = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline'>Align End</Button>} />
      <DropdownMenuContent align='end' className='w-66'>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            New Tab<DropdownMenuShortcut>⌘ + T</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            New Window <DropdownMenuShortcut>⌘ + N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            New Incognito Window <DropdownMenuShortcut>⌘ + ⇧ + N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            History <DropdownMenuShortcut>⌘ + Y</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Downloads <DropdownMenuShortcut>⌥ + ⇧ + L</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DropdownMenuAlignEndDemo
