import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const AvatarRoundedDemo = () => {
  return (
    <Avatar className='rounded-sm after:rounded-[inherit]'>
      <AvatarImage
        src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png'
        alt='Hallie Richards'
        className='rounded-sm'
      />
      <AvatarFallback>HR</AvatarFallback>
    </Avatar>
  )
}

export default AvatarRoundedDemo
