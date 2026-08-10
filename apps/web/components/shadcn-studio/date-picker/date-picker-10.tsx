'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDownIcon } from "lucide-react"

const DatePickerAndTimePickerDemo = () => {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <div className='flex gap-4'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='date-picker' className='px-1'>
          Date picker
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button variant='outline' id='date-picker' />}
            className='justify-between font-normal'
          >
            {date ? date.toLocaleDateString() : 'Pick a date'}
            <ChevronDownIcon
            />
          </PopoverTrigger>
          <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
            <Calendar
              mode='single'
              selected={date}
              onSelect={date => {
                setDate(date)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='time-picker' className='px-1'>
          Time input
        </Label>
        <Input
          type='time'
          id='time-picker'
          step='1'
          defaultValue='06:30:00'
          className='bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
        />
      </div>
    </div>
  )
}

export default DatePickerAndTimePickerDemo
