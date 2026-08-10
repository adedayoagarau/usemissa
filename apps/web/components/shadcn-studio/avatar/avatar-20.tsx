import { Avatar, AvatarGroup, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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

const AvatarGroupOutlineDemo = () => {
  return (
    <div className='bg-background flex w-fit items-center rounded-full border p-1 shadow-sm'>
      <AvatarGroup>
        {avatars.map((avatar, index) => (
          <Avatar key={index} className='ring-background ring-2'>
            <AvatarImage src={avatar.src} alt={avatar.name} />
            <AvatarFallback className='text-xs'>{avatar.fallback}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      <span className='hover:text-foreground bg-transparent px-1.5 ring-0'>+3</span>
    </div>
  )
}

export default AvatarGroupOutlineDemo
