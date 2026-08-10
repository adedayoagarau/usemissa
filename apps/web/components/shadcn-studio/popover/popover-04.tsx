'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Volume2Icon, VolumeXIcon } from "lucide-react"

const PopoverVolumeDemo = () => {
  const [value, setValue] = useState([45])

  return (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' size='icon' />}>
        <Volume2Icon
        />
        <span className='sr-only'>Volume control</span>
      </PopoverTrigger>
      <PopoverContent className='w-80'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <Label className='leading-5'>Volume</Label>
            <span className='text-sm font-medium tabular-nums'>{value}</span>
          </div>
          <div className='flex items-center gap-2'>
            <VolumeXIcon className='size-4 shrink-0 opacity-60' />
            <Slider value={value} onValueChange={value => setValue(value as number[])} aria-label='Volume slider' />
            <Volume2Icon className='size-4 shrink-0 opacity-60' />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default PopoverVolumeDemo
