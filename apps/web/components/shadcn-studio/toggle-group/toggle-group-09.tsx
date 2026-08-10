import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const ToggleGroupTooltip = () => {
  return (
    <div className='flex items-center justify-center'>
      <ToggleGroup variant='outline' spacing={0}>
        <Tooltip>
          <TooltipTrigger render={<ToggleGroupItem value='1' aria-label='today' />}>Today</TooltipTrigger>
          <TooltipContent>March 20, 2026</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<ToggleGroupItem value='2' aria-label='7 days' />}>7D</TooltipTrigger>
          <TooltipContent>March 13, 2026 - March 20, 2026</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<ToggleGroupItem value='3' aria-label='30 days' />}>30D</TooltipTrigger>
          <TooltipContent>Feb 18, 2026 - March 20, 2026</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<ToggleGroupItem value='4' aria-label='3 months' />}>3M</TooltipTrigger>
          <TooltipContent>Dec 20, 2025 - March 20, 2026</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<ToggleGroupItem value='5' aria-label='6 months' />}>6M</TooltipTrigger>
          <TooltipContent>Sept 20, 2025 - March 20, 2026</TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </div>
  )
}

export default ToggleGroupTooltip
