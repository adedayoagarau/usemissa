'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { CircularProgress } from '@/components/ui/circular-progress'
import { cn } from '@/lib/utils'
import { ZapIcon, TrendingUpIcon } from "lucide-react"

const CircularProgressProductivityDemo = () => {
  const [progress, setProgress] = useState(65)
  const val = progress

  const getColor = (v: number) => {
    if (v > 85) return 'text-green-600 dark:text-green-400'
    if (v > 40) return 'text-primary'

    return 'text-destructive'
  }

  const activeColor = getColor(val)

  return (
    <div className='mx-auto flex w-full max-w-xs flex-col items-center py-8'>
      <CircularProgress
        size={180}
        showLabel
        circleStrokeWidth={8}
        progressStrokeWidth={10}
        value={val}
        trackDashArray='8 15'
        shape='round'
        progressClassName={cn('transition-colors duration-500', activeColor)}
        progressBgClassName='text-primary/10'
        renderLabel={v => (
          <div className='flex flex-col items-center'>
            <ZapIcon className={cn('size-6 transition-colors duration-500', activeColor)} />
            <div className='flex items-baseline'>
              <span className={cn('text-4xl font-medium tabular-nums', activeColor)}>{Math.round(v)}</span>
              <span className={cn('ml-0.5 text-base font-medium', activeColor)}>%</span>
            </div>
            <span className='text-muted-foreground text-xs font-medium uppercase'>Daily Score</span>
          </div>
        )}
      />

      <div className='mt-10 w-full space-y-4'>
        <div className='text-muted-foreground flex items-center justify-between px-1 text-xs font-medium uppercase'>
          <div className='flex items-center gap-1.5'>
            <TrendingUpIcon className='size-4' />
            Performance
          </div>
          <span>Target: 90%</span>
        </div>

        <Slider
          value={progress}
          max={100}
          onValueChange={val => setProgress(Array.isArray(val) ? val[0] : val)}
          step={1}
        />
      </div>
    </div>
  )
}

export default CircularProgressProductivityDemo
