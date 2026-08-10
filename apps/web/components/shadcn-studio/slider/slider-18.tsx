'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { DollarSignIcon } from "lucide-react"

const histogramData = [
  5, 8, 12, 10, 15, 20, 25, 60, 90, 75, 85, 60, 45, 40, 35, 30, 25, 20, 18, 22, 45, 65, 85, 50, 40, 30, 25, 35, 20, 10,
  5, 8, 15, 25, 20, 15, 10, 5
]

const SliderChartDemo = () => {
  const min = 0
  const max = 1000
  const step = 1

  const [value, setValue] = useState([200, 769])
  const [minInput, setMinInput] = useState('200')
  const [maxInput, setMaxInput] = useState('769')

  const handleSliderChange = (newValues: number[]) => {
    setValue(newValues)
    setMinInput(newValues[0].toString())
    setMaxInput(newValues[1].toString())
  }

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')

    setMinInput(val)

    const num = parseInt(val)

    if (!isNaN(num)) {
      setValue([Math.min(max, Math.max(min, num)), value[1]])
    }
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')

    setMaxInput(val)

    const num = parseInt(val)

    if (!isNaN(num)) {
      setValue([value[0], Math.min(max, Math.max(min, num))])
    }
  }

  const handleBlur = () => {
    const start = Math.min(max, Math.max(min, Math.min(value[0], value[1])))
    const end = Math.min(max, Math.max(min, Math.max(value[0], value[1])))

    setValue([start, end])
    setMinInput(start.toString())
    setMaxInput(end.toString())
  }

  const isBarActive = (index: number) => {
    const barPosition = (index / (histogramData.length - 1)) * max
    const start = Math.min(value[0], value[1])
    const end = Math.max(value[0], value[1])

    return barPosition >= start && barPosition <= end
  }

  const avgSelected = Math.round((value[0] + value[1]) / 2)

  const handleBarClick = (index: number) => {
    const barPosition = Math.round((index / (histogramData.length - 1)) * max)
    const distToMin = Math.abs(value[0] - barPosition)
    const distToMax = Math.abs(value[1] - barPosition)

    if (distToMin < distToMax) {
      handleSliderChange([barPosition, value[1]])
    } else {
      handleSliderChange([value[0], barPosition])
    }
  }

  return (
    <div className='mx-auto flex w-full max-w-sm flex-col gap-4'>
      <div className='flex flex-col gap-8'>
        <div className='flex items-end justify-between'>
          <div className='space-y-1'>
            <Label className='text-base font-medium'>Price range</Label>
            <p className='text-muted-foreground text-xs font-medium'>Find the best matches for your budget.</p>
          </div>
          <div className='text-right'>
            <p className='text-base font-medium'>${avgSelected}</p>
            <p className='text-muted-foreground text-xs font-medium'>Avg Price</p>
          </div>
        </div>

        <div className='relative flex flex-col pt-18'>
          {/* Histogram Container */}
          <div className='absolute inset-x-1 bottom-1.25 flex h-24 items-end gap-1 px-1'>
            {histogramData.map((height, i) => (
              <button
                type='button'
                key={i}
                onClick={() => handleBarClick(i)}
                style={{ height: `${height}%` }}
                className={cn(
                  'group rounded-t-2 relative flex-1 transition-all duration-300 ease-in-out hover:opacity-80',
                  isBarActive(i) ? 'bg-primary dark:bg-primary/90' : 'bg-muted'
                )}
              ></button>
            ))}
          </div>

          <Slider
            value={value}
            onValueChange={v => handleSliderChange(v as number[])}
            min={min}
            max={max}
            step={step}
            className='relative z-10'
          />
        </div>

        {/* Price Inputs Container */}
        <div className='space-y-4'>
          <div className='flex items-baseline-last gap-4'>
            <div className='flex-1 space-y-1'>
              <Label htmlFor='min-price' className='text-muted-foreground text-sm font-medium'>
                Minimum
              </Label>
              <div className='relative'>
                <span className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium'>
                  <DollarSignIcon className='size-4' />
                </span>
                <Input
                  id='min-price'
                  type='number'
                  min={min}
                  max={max}
                  value={minInput}
                  onChange={handleMinChange}
                  onBlur={handleBlur}
                  className='h-10 [appearance:textfield] pl-8 font-medium transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                />
              </div>
            </div>

            <div className='text-muted-foreground'>-</div>

            <div className='flex-1 space-y-1'>
              <Label htmlFor='max-price' className='text-muted-foreground text-sm font-medium'>
                Maximum
              </Label>
              <div className='relative'>
                <span className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium'>
                  <DollarSignIcon className='size-4' />
                </span>
                <Input
                  id='max-price'
                  type='number'
                  min={min}
                  max={max}
                  value={maxInput}
                  onChange={handleMaxChange}
                  onBlur={handleBlur}
                  className='h-10 [appearance:textfield] pl-8 font-medium transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className='text-muted-foreground text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://21st.dev/community/components/ravikatiyar/range-slider/default'
          target='_blank'
          rel='noopener noreferrer'
        >
          21st Dev
        </a>
      </p>
    </div>
  )
}

export default SliderChartDemo
