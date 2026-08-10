import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const KbdTooltipDemo = () => {
  return (
    <div className='flex flex-wrap gap-4'>
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger render={<Button variant='outline' />}>Format</TooltipTrigger>
          <TooltipContent>
            Format document
            <KbdGroup>
              <Kbd>Shift</Kbd>
              <Kbd>Alt</Kbd>
              <Kbd>F</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant='outline' />}>Run</TooltipTrigger>
          <TooltipContent>
            Run file
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>R</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant='outline' />}>Find</TooltipTrigger>
          <TooltipContent>
            Find in file
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>F</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant='outline' />}>Command Palette</TooltipTrigger>
          <TooltipContent>
            Open Command Palette
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>Shift</Kbd>
              <Kbd>P</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </div>
  )
}

export default KbdTooltipDemo
