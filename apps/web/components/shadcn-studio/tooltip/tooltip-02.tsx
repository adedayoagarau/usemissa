import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const TooltipLightDemo = () => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant='outline' size='sm'>
            Light
          </Button>
        }
      />
      <TooltipContent className='bg-neutral-200 text-neutral-950 *:last:bg-inherit dark:bg-neutral-50'>
        <p>This tooltip will be always light</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default TooltipLightDemo
