'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDownIcon } from "lucide-react"

const DatePickerDisableOutsideDaysDemo = () => {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <div className='flex w-full max-w-xs flex-col gap-2'>
      <Label htmlFor='date' className='px-1'>
        Disable outside days
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant='outline' id='date' />} className='w-full justify-between font-normal'>
          {date ? date.toLocaleDateString() : 'Pick a date'}
          <ChevronDownIcon
          />
        </PopoverTrigger>
        <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
          <Calendar
            mode='single'
            selected={date}
            showOutsideDays={false}
            onSelect={date => {
              setDate(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default DatePickerDisableOutsideDaysDemo
