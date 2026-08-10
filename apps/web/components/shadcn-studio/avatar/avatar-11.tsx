import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const AvatarNotificationBadgeDemo = () => {
  return (
    <Avatar size='lg' className='rounded-sm after:rounded-[inherit]'>
      <AvatarImage
        src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png'
        alt='Hallie Richards'
        className='rounded-sm'
      />
      <AvatarFallback>HR</AvatarFallback>
      <AvatarBadge className='-top-2.5 -right-2.5 bg-indigo-500 px-1 text-xs tabular-nums ring-0 group-data-[size=lg]/avatar:size-5'>
        8
      </AvatarBadge>
    </Avatar>
  )
}

export default AvatarNotificationBadgeDemo
