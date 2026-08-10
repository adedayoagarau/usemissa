import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from '@/components/ui/avatar'
import { PlusCircleIcon } from "lucide-react"

const AvatarPlusDemo = () => {
  return (
    <div className='after:rounded-[inherit]'>
      <Avatar size='lg'>
        <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
        <AvatarFallback>HR</AvatarFallback>
        <AvatarBadge className='-right-1 -bottom-1 bg-white ring-0 group-data-[size=lg]/avatar:size-4.25 group-data-[size=lg]/avatar:[&>svg]:size-4'>
          <PlusCircleIcon className='text-background fill-slate-400' />
        </AvatarBadge>
      </Avatar>
    </div>
  )
}

export default AvatarPlusDemo
