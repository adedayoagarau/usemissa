import { Avatar, AvatarGroup, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
  }
]

const AvatarGroupTooltipTransitionDemo = () => {
  return (
    <AvatarGroup className='**:data-[slot=avatar]:ring-background hover:space-x-1 **:data-[slot=avatar]:ring-2'>
      {avatars.map((avatar, index) => (
        <Tooltip key={index}>
          <TooltipTrigger className='transition-all duration-300 ease-in-out'>
            <Avatar>
              <AvatarImage src={avatar.src} alt={avatar.name} />
              <AvatarFallback>{avatar.fallback}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{avatar.name}</TooltipContent>
        </Tooltip>
      ))}
    </AvatarGroup>
  )
}

export default AvatarGroupTooltipTransitionDemo
