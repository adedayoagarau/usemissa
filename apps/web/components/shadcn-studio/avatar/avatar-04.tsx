import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const AvatarSizeDemo = () => {
  return (
    <Avatar size='lg'>
      <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
      <AvatarFallback>HR</AvatarFallback>
    </Avatar>
  )
}

export default AvatarSizeDemo
