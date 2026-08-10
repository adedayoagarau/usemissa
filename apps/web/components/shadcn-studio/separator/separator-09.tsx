import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StarIcon } from "lucide-react"

const SeparatorText2Demo = () => {
  return (
    <div className='w-full max-w-sm'>
      <div className='flex flex-col gap-10 text-sm'>
        <div className='flex items-center gap-4'>
          <Separator className='flex-1' />
          <span className='text-muted-foreground shrink-0 font-medium'>OR</span>
          <Separator className='flex-1' />
        </div>

        <div className='flex items-center gap-4'>
          <Separator className='flex-1' />
          <Badge variant='outline' className='h-7 shrink-0 rounded-full px-4 text-xs font-medium'>
            New Features
          </Badge>
          <Separator className='flex-1' />
        </div>

        <div className='flex items-center gap-4'>
          <Separator className='border-border flex-1 border-b-2 border-dotted bg-transparent' />
          <Button variant='default' size='sm' className='shrink-0 rounded-full px-4'>
            Add Block
          </Button>
          <Separator className='border-border flex-1 border-b-2 border-dotted bg-transparent' />
        </div>

        <div className='flex items-center gap-4'>
          <Separator className='border-border flex-1 border-b-2 border-dashed bg-transparent' />
          <Avatar className='after:border-none'>
            <AvatarFallback className='bg-primary/10 text-primary'>
              <StarIcon className='size-4' />
            </AvatarFallback>
          </Avatar>
          <Separator className='border-border flex-1 border-b-2 border-dashed bg-transparent' />
        </div>
      </div>
    </div>
  )
}

export default SeparatorText2Demo
