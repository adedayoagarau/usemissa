import { Badge } from '@/components/ui/badge'
import { AlertCircleIcon } from "lucide-react"

const BadgePendingDemo = () => {
  return (
    <Badge
      variant='outline'
      className='rounded-sm border-warning text-warning dark:border-warning dark:text-warning [a]:hover:bg-warning/10 [a]:hover:text-warning/90 dark:[a]:hover:bg-warning/10 dark:[a]:hover:text-warning/90'
    >
      <AlertCircleIcon className='size-3' />
      Pending
    </Badge>
  )
}

export default BadgePendingDemo
