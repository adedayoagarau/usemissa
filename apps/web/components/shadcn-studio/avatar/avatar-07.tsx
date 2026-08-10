import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const AvatarStatusBusyDemo = () => {
  return (
    <Avatar>
      <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
      <AvatarFallback>HR</AvatarFallback>
      <AvatarBadge className='bg-destructive'>
        <span className='sr-only'>Busy</span>
      </AvatarBadge>
    </Avatar>
  )
}

export default AvatarStatusBusyDemo
