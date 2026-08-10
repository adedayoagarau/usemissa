import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const TooltipErrorDemo = () => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant='outline' size='sm'>
            Error
          </Button>
        }
      />
      <TooltipContent className='bg-destructive text-white *:last:bg-inherit'>
        <p>This is an error tooltip</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default TooltipErrorDemo
