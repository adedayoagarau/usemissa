import { useId } from 'react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const BadgeWithLabel = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>
        API Endpoint{' '}
        <Badge className='h-4.5 border-none bg-success/10 px-1.5 py-px text-success focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-success/10 dark:text-success dark:focus-visible:ring-green-400/40 [a&]:hover:bg-success/5 dark:[a&]:hover:bg-success/5'>
          <span className='size-1.5 rounded-full bg-success dark:bg-success' aria-hidden='true' />
          Live
        </Badge>
      </Label>
      <Input id={id} type='text' placeholder='https://api.yourservice.com/v1' />
    </div>
  )
}

export default BadgeWithLabel
