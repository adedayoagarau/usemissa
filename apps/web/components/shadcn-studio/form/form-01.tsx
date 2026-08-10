'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  selectedOption: z.enum(['share-data', 'do-not-share', 'customize'], {
    required_error: 'You must select an option.'
  })
})

type FormValues = z.infer<typeof formSchema>

const RadioGroupFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedOption: undefined
    }
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Selected Option: {data.selectedOption}</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
      <Controller
        name='selectedOption'
        control={form.control}
        render={({ field, fieldState }) => (
          <FieldSet>
            <FieldLegend variant='label' className='mb-4'>
              Manage data sharing preferences
            </FieldLegend>
            <RadioGroup name={field.name} value={field.value} onValueChange={field.onChange} className='mb-3'>
              <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                <RadioGroupItem value='share-data' id='share-option' aria-invalid={fieldState.invalid} />
                <FieldLabel htmlFor='share-option' className='font-normal'>
                  Share Data for Personalized Experience
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                <RadioGroupItem value='do-not-share' id='no-share-option' aria-invalid={fieldState.invalid} />
                <FieldLabel htmlFor='no-share-option' className='font-normal'>
                  Do Not Share Any Data
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                <RadioGroupItem value='customize' id='customize-option' aria-invalid={fieldState.invalid} />
                <FieldLabel htmlFor='customize-option' className='font-normal'>
                  Customize Data Sharing Preferences
                </FieldLabel>
              </Field>
            </RadioGroup>
            <FieldDescription className='mt-0'>Please select one of the options to proceed.</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </FieldSet>
        )}
      />
      <Button type='submit'>Update Preferences</Button>
    </form>
  )
}

export default RadioGroupFormDemo
