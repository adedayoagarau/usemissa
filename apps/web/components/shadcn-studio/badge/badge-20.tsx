import { Badge } from '@/components/ui/badge'
import { BanIcon } from "lucide-react"

const BadgeFailedDemo = () => {
  return (
    <Badge
      variant='outline'
      className='border-destructive text-destructive [a]:hover:bg-destructive/10 [a]:hover:text-destructive/90 rounded-sm'
    >
      <BanIcon className='size-3' />
      Failed
    </Badge>
  )
}

export default BadgeFailedDemo
