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
import { FolderOpenIcon, GitBranchIcon, StarIcon, TagIcon, CopyIcon, Share2Icon } from "lucide-react"

const CommandRepoOps = () => {
  return (
    <Command className='max-w-sm rounded-lg border'>
      <CommandInput placeholder='Switch Repository or operations...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Repositories'>
          <CommandItem>
            <FolderOpenIcon
            />
            <span>design-system</span>
          </CommandItem>
          <CommandItem>
            <GitBranchIcon
            />
            <span>feature/dashboard-v2</span>
          </CommandItem>
          <CommandItem>
            <StarIcon
            />
            <span>StarIconred Projects</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Operations'>
          <CommandItem>
            <TagIcon
            />
            <span>Create Release TagIcon</span>
          </CommandItem>
          <CommandItem>
            <CopyIcon
            />
            <span>Duplicate Project</span>
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Share2Icon
            />
            <span>Share Link</span>
            <CommandShortcut>⌘L</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export default CommandRepoOps
