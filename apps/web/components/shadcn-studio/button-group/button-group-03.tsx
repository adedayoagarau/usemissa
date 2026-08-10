import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MousePointerIcon, SquareIcon, CropIcon, CopyIcon, EllipsisVerticalIcon } from "lucide-react"

const ButtonGroupTooltipDemo = () => {
  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>
          <MousePointerIcon
          />
          <span className='sr-only'>Select</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Select</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>
          <SquareIcon
          />
          <span className='sr-only'>Shapes</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Shapes</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>
          <CropIcon
          />
          <span className='sr-only'>Crop</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Crop</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>
          <CopyIcon
          />
          <span className='sr-only'>Duplicate</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>Duplicate</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant='outline' />}>
          <EllipsisVerticalIcon
          />
          <span className='sr-only'>More</span>
        </TooltipTrigger>
        <TooltipContent className='px-2 py-1 text-xs'>More</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  )
}

export default ButtonGroupTooltipDemo
