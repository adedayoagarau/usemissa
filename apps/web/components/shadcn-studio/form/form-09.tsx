'use client'

import * as React from 'react'

import { format } from 'date-fns'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { cn } from '@/lib/utils'
import { CheckCheckIcon, CalendarIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  dob: z.date({
    required_error: 'A date of birth is required.'
  })
})

type FormValues = z.infer<typeof formSchema>

const DatePickerFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dob: undefined
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 sm:w-100 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Great we send you a personalized outfit suggestion!</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
      <Controller
        name='dob'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field className='gap-2!' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor='dob'>Timeless Trends for You</FieldLabel>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    id='dob'
                    variant='outline'
                    aria-invalid={fieldState.invalid}
                    className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                  >
                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    <CalendarIcon className='ml-auto opacity-50' />
                  </Button>
                }
              ></PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={date => date > new Date() || date < new Date('1900-01-01')}
                />
              </PopoverContent>
            </Popover>
            <FieldDescription>
              Enter your birth date to reveal styles and outfits tailored to your fashion journey.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button type='submit'>Submit</Button>
    </form>
  )
}

export default DatePickerFormDemo
