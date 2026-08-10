import { Avatar, AvatarGroup, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { PlusIcon } from "lucide-react"

const avatars = [
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    fallback: 'OS',
    name: 'Olivia Sparks'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    fallback: 'HL',
    name: 'Howard Lloyd'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    fallback: 'HR',
    name: 'Hallie Richards'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-16.png',
    fallback: 'JW',
    name: 'Jenny Wilson'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    fallback: 'DR',
    name: 'Darlene Robertson'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png',
    fallback: 'LA',
    name: 'Leslie Alexander'
  }
]

const AvatarGroupDropdownDemo = () => {
  return (
    <AvatarGroup>
      {avatars.slice(0, 3).map((avatar, index) => (
        <Avatar key={index}>
          <AvatarImage src={avatar.src} alt={avatar.name} />
          <AvatarFallback>{avatar.fallback}</AvatarFallback>
        </Avatar>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type='button'
              className='bg-muted has-focus-visible:ring-ring/50 ring-background flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full ring-2'
            >
              <PlusIcon className='size-4' />
              <span className='sr-only'>Add</span>
            </button>
          }
        />
        <DropdownMenuContent>
          {avatars.slice(3).map((avatar, index) => (
            <DropdownMenuItem key={index}>
              <Avatar>
                <AvatarImage src={avatar.src} alt={avatar.name} />
                <AvatarFallback>{avatar.fallback}</AvatarFallback>
              </Avatar>
              <span>{avatar.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </AvatarGroup>
  )
}

export default AvatarGroupDropdownDemo
