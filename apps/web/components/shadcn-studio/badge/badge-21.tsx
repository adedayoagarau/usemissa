import { Badge } from '@/components/ui/badge'
import { CheckCircleIcon } from "lucide-react"

const BadgeSuccessfulDemo = () => {
  return (
    <Badge
      variant='outline'
      className='rounded-sm border-success text-success dark:border-success dark:text-success [a]:hover:bg-success/10 [a]:hover:text-success/90 dark:[a]:hover:bg-success/10 dark:[a]:hover:text-success/90'
    >
      <CheckCircleIcon className='size-3' />
      Successful
    </Badge>
  )
}

export default BadgeSuccessfulDemo
