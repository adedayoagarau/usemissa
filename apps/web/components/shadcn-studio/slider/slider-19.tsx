'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RotateCcwIcon, Wand2Icon } from "lucide-react"

const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturation: 100
}

const ImageFilterDemo = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const handleAutoEnhance = () => {
    setFilters({
      brightness: 110,
      contrast: 120,
      saturation: 130
    })
  }

  const hasChanges = Object.entries(filters).some(
    ([key, value]) => value !== DEFAULT_FILTERS[key as keyof typeof DEFAULT_FILTERS]
  )

  const filterStyle = {
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`
  }

  return (
    <div className='mx-auto flex w-full max-w-4xl flex-col gap-6'>
      {/* Image Preview Area */}
      <div className='bg-muted group relative flex-1 overflow-hidden rounded-lg'>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-15.png'
          alt='Landscape preview'
          className='h-full max-h-50 w-full object-cover object-center transition-[filter] duration-200 ease-out'
          style={filterStyle}
        />

        {/* Floating Quick Actions */}
        <div className='absolute right-4 bottom-4 flex items-center gap-2 opacity-100 transition-opacity duration-300'>
          <TooltipProvider delay={150}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='secondary'
                    size='icon'
                    className='bg-background/80 size-8 shadow-sm backdrop-blur-sm'
                    onClick={handleReset}
                    disabled={!hasChanges}
                  />
                }
              >
                <RotateCcwIcon className='size-4' />
              </TooltipTrigger>
              <TooltipContent side='bottom'>Reset</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='secondary'
                    size='icon'
                    className='bg-background/80 size-8 shadow-sm backdrop-blur-sm'
                    onClick={handleAutoEnhance}
                  />
                }
              >
                <Wand2Icon className='size-4' />
              </TooltipTrigger>
              <TooltipContent side='bottom'>Auto Enhance</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Editor Controls */}
      <div className='flex w-full shrink-0 flex-col gap-4'>
        <div>
          <h3 className='text-lg font-medium'>Adjustments</h3>
          <p className='text-muted-foreground text-sm'>Fine-tune the appearance of your photo.</p>
        </div>

        <div className='bg-card rounded-xl border p-6'>
          <div className='flex flex-col gap-6'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>Brightness</label>
                <span className='text-muted-foreground w-8 text-right text-xs tabular-nums'>{filters.brightness}%</span>
              </div>
              <Slider
                aria-label='Brightness'
                min={20}
                max={200}
                value={[filters.brightness]}
                onValueChange={val => setFilters(p => ({ ...p, brightness: Array.isArray(val) ? val[0] : val }))}
              />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>Contrast</label>
                <span className='text-muted-foreground w-8 text-right text-xs tabular-nums'>{filters.contrast}%</span>
              </div>
              <Slider
                aria-label='Contrast'
                min={20}
                max={200}
                value={[filters.contrast]}
                onValueChange={val => setFilters(p => ({ ...p, contrast: Array.isArray(val) ? val[0] : val }))}
              />
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>Saturation</label>
                <span className='text-muted-foreground w-8 text-right text-xs tabular-nums'>{filters.saturation}%</span>
              </div>
              <Slider
                aria-label='Saturation'
                min={0}
                max={300}
                value={[filters.saturation]}
                onValueChange={val => setFilters(p => ({ ...p, saturation: Array.isArray(val) ? val[0] : val }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageFilterDemo
