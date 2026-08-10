import { Avatar, AvatarFallback, AvatarBadge } from '@/components/ui/avatar'
import { ShoppingCartIcon } from "lucide-react"

const BadgeCartDemo = () => {
  return (
    <div className='relative w-fit'>
      <Avatar className='size-9 rounded-sm after:rounded-[inherit]'>
        <AvatarFallback className='rounded-sm'>
          <ShoppingCartIcon className='size-5' />
        </AvatarFallback>
        <AvatarBadge className='bg-primary -top-2.5 -right-2.5 rounded-full text-xs group-data-[size=default]/avatar:size-5'>
          8
        </AvatarBadge>
      </Avatar>
    </div>
  )
}

export default BadgeCartDemo
