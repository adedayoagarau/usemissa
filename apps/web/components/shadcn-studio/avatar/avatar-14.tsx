import { Avatar, AvatarGroupCount, AvatarGroup, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
  }
]

const AvatarGroupMaxDemo = () => {
  return (
    <AvatarGroup>
      {avatars.map((avatar, index) => (
        <Avatar key={index} className='ring-background ring-2'>
          <AvatarImage src={avatar.src} alt={avatar.name} />
          <AvatarFallback>{avatar.fallback}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+9</AvatarGroupCount>
    </AvatarGroup>
  )
}

export default AvatarGroupMaxDemo
