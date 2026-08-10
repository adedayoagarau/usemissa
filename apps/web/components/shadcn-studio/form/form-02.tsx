'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions.'
  })
})

type FormValues = z.infer<typeof formSchema>

const CheckboxFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      acceptTerms: false
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Welcome to the community!</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
      <Controller
        name='acceptTerms'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field orientation='horizontal' data-invalid={fieldState.invalid} className='flex-col items-start!'>
            <div className='flex gap-2'>
              <Checkbox
                id='acceptTerms'
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
              <FieldLabel htmlFor='acceptTerms'>Agree to Join the Community</FieldLabel>
            </div>
            <div className='flex flex-col gap-2'>
              <FieldDescription>
                By clicking &apos;Join Now&apos;, you accept our Community Guidelines and Privacy Policy. We&apos;re
                excited to have you on board!
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </div>
          </Field>
        )}
      />

      <Button type='submit'>Join Now</Button>
    </form>
  )
}

export default CheckboxFormDemo
