import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircleIcon } from "lucide-react"

const PopoverFeedbackDemo = () => {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' size='icon' />}>
        <MessageCircleIcon
        />
        <span className='sr-only'>Feedback</span>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='grid gap-2'>
          <div className='font-medium'>Feedback</div>
          <Textarea placeholder='Type your message here.' className='max-h-56' />
          <div className='grid w-full grid-cols-2 gap-2'>
            <Button size='sm'>Send</Button>
            <Button variant='secondary' size='sm'>
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default PopoverFeedbackDemo
