import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from '@/components/ui/avatar'

const BadgeStatusOnlineDemo = () => {
  return (
    <div className='relative w-fit'>
      <Avatar className='size-10'>
        <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
        <AvatarFallback>HR</AvatarFallback>
        <AvatarBadge className='bg-green-600 group-data-[size=default]/avatar:size-2 dark:bg-green-400'>
          <span className='sr-only'>Online</span>
        </AvatarBadge>
      </Avatar>
    </div>
  )
}

export default BadgeStatusOnlineDemo
