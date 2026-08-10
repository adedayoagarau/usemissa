import { Badge } from '@/components/ui/badge'
import { StarIcon } from "lucide-react"

const BadgeWithIconDemo = () => {
  return (
    <Badge>
      <StarIcon className='size-3' />
      With Icon
    </Badge>
  )
}

export default BadgeWithIconDemo
