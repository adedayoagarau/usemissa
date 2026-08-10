'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  email: z.string().min(1, 'Email is required').email({ message: 'Please enter a valid email address.' }),
  issue: z.string().min(1, {
    message: 'Kindly select an issue.'
  }),
  selectedOption: z.enum(['replace', 'refund', 'support'], {
    required_error: 'Selection of an option is required.'
  }),
  message: z.string().min(50, 'Describe your issue using at least 50 characters.')
})

type FormValues = z.infer<typeof formSchema>

const ContactUSFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      issue: '',
      selectedOption: undefined,
      message: ''
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 sm:w-122 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Issue submitted successfully! Our team will reach out to you shortly.</AlertTitle>
      </Alert>
    ))
  }

  return (
    <Card className='w-full max-w-sm shadow-none'>
      <CardHeader>
        <CardTitle>Report Issue</CardTitle>
        <CardDescription>Describe the issue you&apos;re facing; our team will help you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
          {/* Email Field */}
          <Controller
            name='email'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type='email'
                  aria-invalid={fieldState.invalid}
                  placeholder='Email address'
                  autoComplete='email'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Issue Select Field */}
          <Controller
            name='issue'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='issue'>Issue</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='issue' className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Issue you are facing' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='damaged'>Product is Damaged</SelectItem>
                    <SelectItem value='got-different'>Received wrong product</SelectItem>
                    <SelectItem value='not-like'>Not as expectation</SelectItem>
                    <SelectItem value='other'>Other</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Radio Group Field */}
          <Controller
            name='selectedOption'
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet>
                <FieldLegend variant='label'>How can we help you?</FieldLegend>
                <RadioGroup name={field.name} value={field.value} onValueChange={field.onChange}>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='replace' id='want-replace' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-replace' className='font-normal'>
                      Need a product replacement
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='refund' id='want-refund' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-refund' className='font-normal'>
                      Need a refund
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='support' id='want-support' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-support' className='font-normal'>
                      Need guidance or support
                    </FieldLabel>
                  </Field>
                </RadioGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldSet>
            )}
          />

          {/* Message Textarea Field */}
          <Controller
            name='message'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Please describe your issue</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder='Provide detailed information about your issue'
                  className='min-h-30 resize-none'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type='submit'>Submit</Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ContactUSFormDemo
