import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const AvatarStatusAwayDemo = () => {
  return (
    <Avatar className='rounded-sm after:rounded-[inherit]'>
      <AvatarImage
        src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png'
        alt='Hallie Richards'
        className='rounded-sm'
      />
      <AvatarFallback>HR</AvatarFallback>
      <AvatarBadge className='-top-1 -right-1 bg-amber-600 group-data-[size=default]/avatar:size-2 dark:bg-amber-400'>
        <span className='sr-only'>Away</span>
      </AvatarBadge>
    </Avatar>
  )
}

export default AvatarStatusAwayDemo
