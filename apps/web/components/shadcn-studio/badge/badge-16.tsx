import { Badge } from '@/components/ui/badge'

const BadgeInProgressDemo = () => {
  return (
    <Badge className='border-none bg-warning/10 text-warning focus-visible:ring-amber-600/20 focus-visible:outline-none dark:bg-warning/10 dark:text-warning dark:focus-visible:ring-amber-400/40 [a]:hover:bg-warning/5 dark:[a]:hover:bg-warning/5'>
      <span className='size-1.5 rounded-full bg-warning dark:bg-warning' aria-hidden='true' />
      In Progress
    </Badge>
  )
}

export default BadgeInProgressDemo
