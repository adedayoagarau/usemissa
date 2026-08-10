import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import BadgeCheck from '@/assets/svg/badge-check'

const AvatarVerifiedDemo = () => {
  return (
    <div className='relative w-fit'>
      <Avatar size='lg'>
        <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
        <AvatarFallback>HR</AvatarFallback>
      </Avatar>
      <span className='absolute -top-1.5 -right-1.5'>
        <span className='sr-only'>Verified</span>
        <BadgeCheck className='text-background size-5 fill-sky-500' />
      </span>
    </div>
  )
}

export default AvatarVerifiedDemo
