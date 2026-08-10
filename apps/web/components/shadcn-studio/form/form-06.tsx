'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  message: z
    .string()
    .min(50, 'Message must be at least 50 characters long.')
    .max(500, 'Message cannot exceed 500 characters.')
})

type FormValues = z.infer<typeof formSchema>

const TextareaFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: ''
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 sm:w-110 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Your application is submitted. We will contact you soon.</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
      <Controller
        name='message'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Tell Us About Yourself</FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="Why do you think you're the perfect fit for this position?"
            />
            <FieldDescription>
              Please include your qualifications, skills, and experiences that make you stand out.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button type='submit'>Submit</Button>
    </form>
  )
}

export default TextareaFormDemo
