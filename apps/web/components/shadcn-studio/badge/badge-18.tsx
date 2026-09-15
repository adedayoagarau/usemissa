import { Badge } from '@/components/ui/badge'

const BadgeCompletedDemo = () => {
  return (
    <Badge className='border-none bg-success/10 text-success focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-success/10 dark:text-success dark:focus-visible:ring-green-400/40 [a]:hover:bg-success/5 dark:[a]:hover:bg-success/5'>
      <span className='size-1.5 rounded-full bg-success dark:bg-success' aria-hidden='true' />
      Completed
    </Badge>
  )
}

export default BadgeCompletedDemo
