import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, LinkIcon, Heading2Icon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from "lucide-react"

const ToggleGroupToolbar = () => {
  return (
    <div className='flex items-center rounded-md border shadow-xs'>
      <ToggleGroup
        defaultValue={['bold', 'underline']}
        multiple
        variant='outline'
        spacing={0}
        className='rounded-l-md rounded-r-none border-0 shadow-none'
      >
        <Tooltip>
          <TooltipTrigger
            render={<ToggleGroupItem value='bold' aria-label='Bold' className='rounded-none rounded-l-md border-0!' />}
          >
            <BoldIcon
            />
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={<ToggleGroupItem value='italic' aria-label='Italic' className='rounded-none border-0' />}
          >
            <ItalicIcon
            />
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={<ToggleGroupItem value='underline' aria-label='Underline' className='rounded-none border-0' />}
          >
            <UnderlineIcon
            />
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <ToggleGroupItem value='strikethrough' aria-label='Strikethrough' className='rounded-none border-0' />
            }
          >
            <StrikethroughIcon
            />
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<ToggleGroupItem value='link' aria-label='Link' className='rounded-none border-0' />}>
            <LinkIcon
            />
          </TooltipTrigger>
          <TooltipContent>Link</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={<ToggleGroupItem value='heading' aria-label='Heading' className='rounded-none border-0' />}
          >
            <Heading2Icon
            />
          </TooltipTrigger>
          <TooltipContent>Heading</TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <ToggleGroup
        defaultValue={['center']}
        variant='outline'
        spacing={0}
        className='rounded-l-none rounded-r-md border-0 shadow-none'
      >
        <ToggleGroupItem value='left' aria-label='Align left' className='rounded-none border-0'>
          <AlignLeftIcon
          />
        </ToggleGroupItem>
        <ToggleGroupItem value='center' aria-label='Align center' className='rounded-none border-0'>
          <AlignCenterIcon
          />
        </ToggleGroupItem>

        <ToggleGroupItem value='right' aria-label='Align right' className='rounded-none rounded-r-md border-0'>
          <AlignRightIcon
          />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export default ToggleGroupToolbar
