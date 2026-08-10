import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { InfoIcon } from "lucide-react"

const TooltipIconDemo = () => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant='outline' size='sm'>
            Icon
          </Button>
        }
      />
      <TooltipContent className='max-w-64 text-pretty'>
        <div className='flex items-center gap-1.5'>
          <InfoIcon className='size-5' />
          <p>This tooltip has an icon</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default TooltipIconDemo
