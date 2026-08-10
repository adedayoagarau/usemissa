'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { CheckCheckIcon } from "lucide-react"

const SheetWithFormDemo = () => {
  const FormSchema = z.object({
    firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email({ message: 'Please enter a valid email address.' }),
    mobileNumber: z
      .number({ required_error: 'Mobile number is required', invalid_type_error: 'Please enter a valid number' })
      .int('Mobile number must be a whole number')
      .positive('Mobile number must be positive')
      .refine(val => val.toString().length === 10, 'Mobile number must be exactly 10 digits'),
    password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters')
  })

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: undefined,
      password: ''
    }
  })

  const onSubmit = () => {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'>
        <CheckCheckIcon
        />
        <AlertTitle>Account created successfully!</AlertTitle>
      </Alert>
    ))
  }

  return (
    <Sheet>
      <SheetTrigger render={<Button variant='outline' />}>Sign Up</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className='text-center text-xl font-bold'>Sign Up</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className='w-full'>
          <div className='space-y-4 p-4 pt-0'>
            {/* First Name Field */}
            <Controller
              name='firstName'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='gap-2!'>
                  <FieldLabel htmlFor={field.name}>First Name</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder='First name' />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Last Name Field */}
            <Controller
              name='lastName'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='gap-2!'>
                  <FieldLabel htmlFor={field.name}>Last Name</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder='Last name' />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Email Field */}
            <Controller
              name='email'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='gap-2!'>
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

            {/* Mobile Number Field */}
            <Controller
              name='mobileNumber'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='gap-2!'>
                  <FieldLabel htmlFor={field.name}>Mobile Number</FieldLabel>
                  <Input
                    id={field.name}
                    type='tel'
                    aria-invalid={fieldState.invalid}
                    placeholder='8585858585'
                    value={field.value ? field.value.toString() : ''}
                    onChange={e => {
                      const value = e.target.value.replace(/[^\d]/g, '')
                      const limitedValue = value.slice(0, 10)
                      const numValue = limitedValue === '' ? undefined : parseInt(limitedValue, 10)

                      field.onChange(numValue)
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Password Field */}
            <Controller
              name='password'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className='gap-2!'>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type='password'
                    aria-invalid={fieldState.invalid}
                    placeholder='Password'
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <SheetFooter>
            <Button type='submit'>Create Account</Button>

            <SheetClose render={<Button variant='outline' />}>Close</SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export default SheetWithFormDemo
