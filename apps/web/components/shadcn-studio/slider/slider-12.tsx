'use client'

import { useState } from 'react'

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const SliderMultiTooltipDemo = () => {
  const [rangeValues, setRangeValues] = useState([25, 60])
  const [distValues, setDistValues] = useState([20, 50, 80])
  const [isHoveringRange, setIsHoveringRange] = useState(false)
  const [isHoveringDist, setIsHoveringDist] = useState(false)

  return (
    <TooltipProvider>
      <div className='flex w-full max-w-xs flex-col gap-14'>
        {/* Price Range Section */}
        <div className='space-y-4'>
          <Label className='text-sm font-medium'>Price Selection</Label>
          <div
            className='relative px-0.5'
            onMouseEnter={() => setIsHoveringRange(true)}
            onMouseLeave={() => setIsHoveringRange(false)}
          >
            {rangeValues.map((val, i) => (
              <Tooltip key={`range-${i}`} open={isHoveringRange}>
                <TooltipTrigger
                  render={
                    <div
                      className='pointer-events-none absolute top-[50%] h-px w-px'
                      style={{
                        left: `calc(${val}% + ${10 - val * 0.2}px)`
                      }}
                    />
                  }
                />
                <TooltipContent
                  side='top'
                  className='bg-primary text-primary-foreground font-medium *:last:hidden'
                  sideOffset={5}
                >
                  ${val}
                </TooltipContent>
              </Tooltip>
            ))}
            <Slider
              value={rangeValues}
              onValueChange={v => setRangeValues(v as number[])}
              max={100}
              step={1}
              aria-label='Price slider'
            />
          </div>
          <p className='text-center text-sm font-medium'>
            <span className='text-muted-foreground'>Budget:</span> <span>${rangeValues[0]}</span> -{' '}
            <span>${rangeValues[1]}</span>
          </p>
        </div>

        {/* Temperature Monitoring Section */}
        <div className='space-y-4'>
          <Label className='text-sm font-medium'>Temperature Monitoring</Label>
          <div
            className='relative px-0.5'
            onMouseEnter={() => setIsHoveringDist(true)}
            onMouseLeave={() => setIsHoveringDist(false)}
          >
            {distValues.map((val, i) => (
              <Tooltip key={`dist-${i}`} open={isHoveringDist}>
                <TooltipTrigger
                  render={
                    <div
                      className='pointer-events-none absolute top-[50%] h-px w-px'
                      style={{
                        left: `calc(${val}% + ${10 - val * 0.2}px)`
                      }}
                    />
                  }
                />
                <TooltipContent
                  side='top'
                  className='bg-primary text-primary-foreground font-medium *:last:hidden'
                  sideOffset={15}
                >
                  {val}°C
                </TooltipContent>
              </Tooltip>
            ))}
            <Slider
              value={distValues}
              onValueChange={v => setDistValues(v as number[])}
              max={100}
              step={1}
              aria-label='Temperature slider'
            />
          </div>
          <div className='text-muted-foreground flex justify-between text-sm font-medium uppercase'>
            <span>Cold: {distValues[0]}°C</span>
            <span>Warm: {distValues[1]}°C</span>
            <span>Hot: {distValues[2]}°C</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default SliderMultiTooltipDemo
