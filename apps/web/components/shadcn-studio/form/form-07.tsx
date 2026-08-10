'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  email: z
    .string({
      required_error: 'Please select an email.'
    })
    .email()
})

type FormValues = z.infer<typeof formSchema>

const SelectFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: undefined
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 sm:w-110 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Your account has been recovered</AlertTitle>
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
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id='email' className='w-full' aria-invalid={fieldState.invalid}>
                <SelectValue placeholder='Enter your registered email' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='m@example.com'>user1@gmail.com</SelectItem>
                <SelectItem value='m@google.com'>user007@gmail.com</SelectItem>
                <SelectItem value='m@support.com'>user69@outlook.com</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>Recover Your Account</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button type='submit'>Recover</Button>
    </form>
  )
}

export default SelectFormDemo
