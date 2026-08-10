'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { VolumeXIcon, VolumeIcon, Volume1Icon, Volume2Icon } from "lucide-react"

const SliderTooltipDemo = () => {
  const [value, setValue] = useState(70)
  const [isHovering, setIsHovering] = useState(false)

  const getVolumeIcon = (v: number) => {
    return (
      <>
        {v === 0 && (
          <VolumeXIcon className='size-4' />
        )}
        {v > 0 && v < 33 && (
          <VolumeIcon className='size-4' />
        )}
        {v >= 33 && v < 66 && (
          <Volume1Icon className='size-4' />
        )}
        {v >= 66 && (
          <Volume2Icon className='size-4' />
        )}
      </>
    )
  }

  const percentage = value

  return (
    <TooltipProvider>
      <div className='mx-auto flex w-full max-w-xs flex-col gap-3'>
        <div className='flex items-center justify-between px-1'>
          <div className='mb-1 flex items-center gap-2 text-sm font-medium'>
            Volume
            {getVolumeIcon(value)}
          </div>
          <div className='text-sm font-medium tabular-nums'>
            {value}
            <span className='text-sm font-medium'>%</span>
          </div>
        </div>

        <div
          className='relative px-0.5'
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <Tooltip open={isHovering}>
            <TooltipTrigger
              render={
                <div
                  className='pointer-events-none absolute top-[50%] h-px w-px'
                  style={{
                    left: `calc(${percentage}% + ${10 - percentage * 0.2}px)`
                  }}
                />
              }
            />
            <TooltipContent side='top' className='text-primary-foreground font-medium' sideOffset={20}>
              <div className='flex items-center gap-1'>
                <span className='tabular-nums'>{value}%</span>
              </div>
            </TooltipContent>
          </Tooltip>

          <Slider
            value={value}
            onValueChange={v => setValue(v as number)}
            min={0}
            max={100}
            step={1}
            aria-label='Volume slider'
          />
        </div>

        <div className='text-muted-foreground flex justify-between px-1 text-sm font-medium uppercase'>
          <span>0 (Muted)</span>
          <span>50 (Mid)</span>
          <span>100 (Peak)</span>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default SliderTooltipDemo
