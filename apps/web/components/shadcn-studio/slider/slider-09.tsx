'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { BatteryIcon, ZapIcon, GaugeIcon } from "lucide-react"

const maxSteps = 20
const stepInterval = 5

const getPerformanceMode = (val: number) => {
  if (val <= 6) {
    return {
      title: 'Efficiency Mode',
      description: 'Maximize battery life and efficiency.'
    }
  }

  if (val <= 14) {
    return {
      title: 'Balanced Mode',
      description: 'Precision adjustment for demanding tasks.'
    }
  }

  return {
    title: 'Turbo Boost Active',
    description: 'Maximum performance for heavy workloads.'
  }
}

const SliderWithTicksDemo = () => {
  const [value, setValue] = useState(10)
  const currentValue = value

  const ticks = Array.from({ length: maxSteps + 1 }, (_, i) => i)
  const { title, description } = getPerformanceMode(currentValue)

  return (
    <div className='flex w-full max-w-xs flex-col gap-6'>
      <div className='relative w-full space-y-4'>
        {/* Icons Header */}
        <div className='text-muted-foreground flex items-center justify-between px-1'>
          <BatteryIcon className={cn('size-5 transition-colors', currentValue < 8 && 'text-primary')} />
          <ZapIcon className={cn('size-5 transition-colors', currentValue > 14 && 'text-primary')} />
        </div>

        {/* Main Slider */}
        <Slider
          aria-label='System Performance'
          value={value}
          onValueChange={v => setValue(v as number)}
          max={maxSteps}
          step={1}
          className='**:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:border-primary/50'
        />

        {/* Ticks and Labels */}
        <div aria-hidden='true' className='flex w-full items-baseline justify-between px-0.5'>
          {ticks.map(i => {
            const isMajor = i % stepInterval === 0
            const isActive = i <= currentValue

            let label = ''

            if (i === 0) label = 'Eco'
            else if (i === 10) label = 'Mid'
            else if (i === 20) label = 'Turbo'
            else if (isMajor) label = String(i)

            return (
              <div key={i} className='flex flex-col items-center gap-1'>
                <div
                  className={cn(
                    'w-0.5 rounded-full transition-all duration-300',
                    isActive ? 'bg-primary' : 'bg-primary/20',
                    isMajor ? 'h-3' : 'h-1.5'
                  )}
                />

                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isMajor ? 'text-muted-foreground opacity-100' : 'opacity-0'
                  )}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mode Details Footer */}
      <div className='flex w-full items-center gap-3'>
        <div className='bg-muted flex size-8 items-center justify-center rounded-md'>
          <GaugeIcon className='size-5' />
        </div>

        <div className='flex flex-col gap-0.5'>
          <span className='text-sm font-medium'>{title}</span>
          <span className='text-muted-foreground text-xs'>{description}</span>
        </div>
      </div>
    </div>
  )
}

export default SliderWithTicksDemo
