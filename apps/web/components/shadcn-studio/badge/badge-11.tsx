import { Badge } from '@/components/ui/badge'
import { ArrowRightIcon } from "lucide-react"

const BadgeLinkDemo = () => {
  return (
    <Badge render={<a href='#' />} className='focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-0'>
      Link{' '}
      <ArrowRightIcon className='size-3' />
    </Badge>
  )
}

export default BadgeLinkDemo
