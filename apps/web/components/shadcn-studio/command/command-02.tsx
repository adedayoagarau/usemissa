import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command'
import { HomeIcon, PanelsTopLeftIcon, BellIcon, PlusIcon, PencilIcon, LogOutIcon } from "lucide-react"

const CommandPagesActions = () => {
  return (
    <Command className='max-w-sm rounded-lg border'>
      <CommandInput placeholder='Search pages or actions...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Pages'>
          <CommandItem>
            <HomeIcon
            />
            <span>Home</span>
            <CommandShortcut>⌘H</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <PanelsTopLeftIcon
            />
            <span>Dashboard</span>
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <BellIcon
            />
            <span>Notifications</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Actions'>
          <CommandItem>
            <PlusIcon
            />
            <span>New Document</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <PencilIcon
            />
            <span>Edit Profile</span>
          </CommandItem>
          <CommandItem>
            <LogOutIcon
            />
            <span>Log Out</span>
            <CommandShortcut>⌘Q</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export default CommandPagesActions
