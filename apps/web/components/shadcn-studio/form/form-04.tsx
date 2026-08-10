'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  email: z.string().min(1, 'Email is required').email({ message: 'Please enter a valid email address.' })
})

type FormValues = z.infer<typeof formSchema>

const InputFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = () => {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Reset password link sent to your email</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
      <Controller
        name='email'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Reset Your Password:</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type='email'
              aria-invalid={fieldState.invalid}
              placeholder='Email address'
              autoComplete='email'
            />
            <FieldDescription>Enter your email address to receive a reset link.</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button type='submit'>Send Link</Button>
    </form>
  )
}

export default InputFormDemo
