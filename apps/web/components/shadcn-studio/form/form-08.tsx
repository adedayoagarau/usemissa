'use client'

import { zodResolver } from '@hookform/resolvers/zod'

import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { CheckCheckIcon } from "lucide-react"

const paymentMethod = [
  'Credit Card',
  'PayPal',
  'Apple Pay',
  'Google Pay',
  'Bank Transfer',
  'Bitcoin',
  'Cash on Delivery'
]

// Define the form schema
const formSchema = z.object({
  method: z.string({ required_error: 'Payment method is required.' })
})

type FormValues = z.infer<typeof formSchema>

const ComboboxFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      method: undefined
    }
  })

  function onSubmit(data: FormValues) {
    const selectedMethod = paymentMethod.find(method => method === data.method)

    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon
        />
        <AlertTitle>You selected &quot;{selectedMethod}&quot; for payment</AlertTitle>
      </Alert>
    ))
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='w-full max-w-md space-y-6'>
      <Controller
        name='method'
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor='method'>Select your payment method</FieldLabel>
            <Combobox items={paymentMethod} onValueChange={field.onChange}>
              <ComboboxInput aria-invalid={fieldState.invalid} placeholder='Select a payment method' />
              <ComboboxContent>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <ComboboxList>
                  {item => (
                    <ComboboxItem key={item} value={item} onSelect={() => field.onChange(item)}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldDescription>Select your preferred payment method.</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button type='submit'>Continue</Button>
    </form>
  )
}

export default ComboboxFormDemo
