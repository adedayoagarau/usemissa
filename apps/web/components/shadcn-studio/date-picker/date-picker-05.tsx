'use client'

import { useState } from 'react'

import { parseDate } from 'chrono-node'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from "lucide-react"

function formatDate(date: Date | undefined) {
  if (!date) {
    return ''
  }

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const DatePickerWithNaturalLanguageDemo = () => {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('In 2 days')
  const [date, setDate] = useState<Date | undefined>(parseDate(value) || undefined)
  const [month, setMonth] = useState<Date | undefined>(date)

  return (
    <div className='flex w-full max-w-xs flex-col gap-2'>
      <Label htmlFor='date' className='px-1'>
        Date picker with natural language input
      </Label>
      <div className='relative flex gap-2'>
        <Input
          id='date'
          value={value}
          placeholder='Tomorrow or next week'
          className='bg-background pr-10'
          onChange={e => {
            setValue(e.target.value)
            const date = parseDate(e.target.value)

            if (date) {
              setDate(date)
              setMonth(date)
            }
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button id='date-picker' variant='ghost' />}
            className='absolute top-1/2 right-2 size-6 -translate-y-1/2 active:-translate-y-1/2'
          >
            <CalendarIcon className='size-3.5' />
            <span className='sr-only'>Pick a date</span>
          </PopoverTrigger>
          <PopoverContent className='w-auto overflow-hidden p-0' align='end' alignOffset={-8} sideOffset={10}>
            <Calendar
              mode='single'
              selected={date}
              month={month}
              onMonthChange={setMonth}
              onSelect={date => {
                setDate(date)
                setValue(formatDate(date))
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className='text-muted-foreground px-1 text-sm'>
        Your post will be published on <span className='font-medium'>{formatDate(date)}</span>.
      </div>
    </div>
  )
}

export default DatePickerWithNaturalLanguageDemo
