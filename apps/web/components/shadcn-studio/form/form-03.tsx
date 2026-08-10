'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  stepTracker: z.boolean().refine(val => val === true, {
    message: 'You must enable step tracker to proceed.'
  })
})

type FormValues = z.infer<typeof formSchema>

const SwitchFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stepTracker: false
    }
  })

  function onSubmit(data: FormValues) {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Step tracker is {data.stepTracker ? 'enabled' : 'disabled'} &quot;Go! Run&quot;.</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
      <Controller
        name='stepTracker'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field orientation='horizontal' data-invalid={fieldState.invalid} className='flex-col items-start!'>
            <div className='flex gap-2'>
              <Switch
                id='stepTracker'
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
              <FieldLabel htmlFor='stepTracker'>Enable Daily Step Tracker</FieldLabel>
            </div>
            <div className='flex flex-col gap-2'>
              <FieldDescription>Track your daily steps to help you reach your fitness goals.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </div>
          </Field>
        )}
      />

      <Button type='submit'>Activate</Button>
    </form>
  )
}

export default SwitchFormDemo
