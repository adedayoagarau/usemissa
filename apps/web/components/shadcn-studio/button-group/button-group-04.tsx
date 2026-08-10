import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SkipBackIcon, PlayIcon, PauseIcon, SkipForwardIcon } from "lucide-react"

const ButtonGroupRoundedDemo = () => {
  return (
    <ButtonGroup className='*:border-primary *:not-last:border-r-primary-foreground/30 *:bg-clip-border'>
      <Tooltip>
        <TooltipTrigger render={<Button />}>
          <SkipBackIcon
          />
          <span className='sr-only'>Skip Back</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Skip Back</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button />}>
          <PlayIcon
          />
          <span className='sr-only'>Play</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Play</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button />}>
          <PauseIcon
          />
          <span className='sr-only'>Pause</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Pause</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button />}>
          <SkipForwardIcon
          />
          <span className='sr-only'>Skip Forward</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Skip Forward</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  )
}

export default ButtonGroupRoundedDemo
