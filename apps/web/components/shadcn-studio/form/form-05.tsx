'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { CheckCheckIcon } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  pin: z.string().min(6, {
    message: 'Your one-time password must be 6 characters.'
  })
})

type FormValues = z.infer<typeof formSchema>

const InputOTPFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: ''
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 sm:w-100 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>Your verification is complete. You can now proceed.</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-xs space-y-6'>
      <Controller
        name='pin'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor='pin'>One-Time Password</FieldLabel>
            <InputOTP maxLength={6} {...field} id='pin'>
              <InputOTPGroup className='*:aria-invalid:ring-destructive/20 *:dark:aria-invalid:ring-destructive/40 gap-2 has-aria-invalid:ring-0 *:aria-invalid:ring-3 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border'>
                <InputOTPSlot aria-invalid={fieldState.invalid} index={0} />
                <InputOTPSlot aria-invalid={fieldState.invalid} index={1} />
                <InputOTPSlot aria-invalid={fieldState.invalid} index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className='*:aria-invalid:ring-destructive/20 *:dark:aria-invalid:ring-destructive/40 gap-2 has-aria-invalid:ring-0 *:aria-invalid:ring-3 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border'>
                <InputOTPSlot aria-invalid={fieldState.invalid} index={3} />
                <InputOTPSlot aria-invalid={fieldState.invalid} index={4} />
                <InputOTPSlot aria-invalid={fieldState.invalid} index={5} />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription>Please enter the 6-digit OTP sent to your phone.</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button type='submit'>Submit</Button>
    </form>
  )
}

export default InputOTPFormDemo
