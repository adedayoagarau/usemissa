'use client'

import { useState } from 'react'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { HardDriveIcon } from "lucide-react"

const ProgressStorageDemo = () => {
  const [value, setValue] = useState(65)

  return (
    <div className='bg-card w-full max-w-sm rounded-xl p-6 shadow-sm'>
      <Field className='gap-4'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg'>
            <HardDriveIcon className='size-5' />
          </div>
          <div className='flex flex-col justify-center gap-0.5'>
            <FieldLabel className='text-base'>System Storage</FieldLabel>
            <FieldDescription>Local Disk (C:)</FieldDescription>
          </div>
        </div>

        <Progress value={value} className='*:data-[slot=progress-track]:h-1.5'>
          <ProgressLabel className='text-sm font-medium'>Usage</ProgressLabel>
          <ProgressValue className='text-foreground text-sm font-medium' />
        </Progress>

        <div className='space-y-2'>
          <p className='text-sm font-medium'>Adjust simulated capacity</p>
          <Slider
            value={[value]}
            onValueChange={val => setValue(Array.isArray(val) ? val[0] : val)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </Field>
    </div>
  )
}

export default ProgressStorageDemo
