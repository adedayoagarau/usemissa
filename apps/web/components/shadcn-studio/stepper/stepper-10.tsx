'use client'

import { useState, useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperNav,
  StepperTitle,
  StepperPanel,
  StepperContent
} from '@/components/ui/stepper'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, ArrowLeftIcon } from "lucide-react"

const steps = [
  { id: 'details', title: 'Personal Info', description: 'Enter your first and last name' },
  { id: 'review', title: 'Contact Info', description: 'Provide your email address and phone number' },
  { id: 'done', title: 'Address', description: 'Enter street address, city, and ZIP code' }
]

// Validation schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters')
})

const contactInfoSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits')
})

const addressSchema = z.object({
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters')
})

type PersonalInfo = z.infer<typeof personalInfoSchema>
type ContactInfo = z.infer<typeof contactInfoSchema>
type Address = z.infer<typeof addressSchema>

type FormData = { personal?: PersonalInfo; contact?: ContactInfo; address?: Address }

// Forms
const PersonalInfoForm = ({
  onNext,
  defaultValues
}: {
  onNext: (d: PersonalInfo) => void
  defaultValues?: PersonalInfo
}) => {
  const form = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: defaultValues || { firstName: '', lastName: '' }
  })

  useEffect(() => {
    form.reset(defaultValues || { firstName: '', lastName: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues])

  return (
    <form onSubmit={form.handleSubmit(onNext)} className='space-y-4'>
      <FieldGroup>
        <Controller
          name='firstName'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='text-start' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='firstName'>First Name</FieldLabel>
              <Input {...field} id='firstName' placeholder='John' aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='lastName'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='text-start'>
              <FieldLabel htmlFor='lastName'>Last Name</FieldLabel>
              <Input {...field} id='lastName' placeholder='Doe' aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className='flex justify-end'>
        <Button type='submit'>
          Next{' '}
          <ArrowRightIcon className='size-4' />
        </Button>
      </div>
    </form>
  )
}

const ContactInfoForm = ({
  onNext,
  onPrev,
  defaultValues,
  showPrev
}: {
  onNext: (d: ContactInfo) => void
  onPrev: () => void
  defaultValues?: ContactInfo
  showPrev?: boolean
}) => {
  const form = useForm<ContactInfo>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: defaultValues || { email: '', phone: '' }
  })

  useEffect(() => {
    form.reset(defaultValues || { email: '', phone: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues])

  return (
    <form onSubmit={form.handleSubmit(onNext)} className='space-y-4'>
      <FieldGroup>
        <Controller
          name='email'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='text-start' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input
                {...field}
                id='email'
                type='email'
                placeholder='john@example.com'
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='phone'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='text-start'>
              <FieldLabel htmlFor='phone'>Phone</FieldLabel>
              <Input {...field} id='phone' placeholder='1234567890' aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className='flex justify-end gap-4'>
        {showPrev !== false && (
          <Button type='button' onClick={onPrev}>
            <ArrowLeftIcon className='size-4' />{' '}
            Previous
          </Button>
        )}
        <Button type='submit'>
          Next{' '}
          <ArrowRightIcon className='size-4' />
        </Button>
      </div>
    </form>
  )
}

const AddressForm = ({
  onNext,
  onPrev,
  onReset,
  defaultValues,
  showPrev
}: {
  onNext: (d: Address) => void
  onPrev: () => void
  onReset?: () => void
  defaultValues?: Address
  showPrev?: boolean
}) => {
  const form = useForm<Address>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultValues || { street: '', city: '', zipCode: '' }
  })

  useEffect(() => {
    form.reset(defaultValues || { street: '', city: '', zipCode: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues])

  return (
    <form onSubmit={form.handleSubmit(onNext)} className='space-y-4'>
      <FieldGroup>
        <Controller
          name='street'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='text-start'>
              <FieldLabel htmlFor='street'>Street</FieldLabel>
              <Input {...field} id='street' placeholder='123 Main St' aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='city'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='text-start'>
              <FieldLabel htmlFor='city'>City</FieldLabel>
              <Input {...field} id='city' placeholder='New York' aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='zipCode'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='text-start'>
              <FieldLabel htmlFor='zipCode'>ZIP Code</FieldLabel>
              <Input {...field} id='zipCode' placeholder='10001' aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className='flex justify-end gap-4'>
        {showPrev !== false && (
          <Button onClick={onPrev}>
            <ArrowLeftIcon className='size-4' />{' '}
            Previous
          </Button>
        )}
        <Button onClick={onReset}>Reset</Button>
        <Button type='submit'>
          Finish{' '}
          <ArrowRightIcon className='size-4' />
        </Button>
      </div>
    </form>
  )
}

const StepperFormDemo = () => {
  const [current, setCurrent] = useState(steps[0].id)
  const [formData, setFormData] = useState<FormData>({})
  const [submitted, setSubmitted] = useState(false)
  const [validSteps, setValidSteps] = useState<Record<string, boolean>>({})

  const currentIndex = steps.findIndex(s => s.id === current)
  const goNext = () => setCurrent(steps[Math.min(currentIndex + 1, steps.length - 1)].id)
  const goBack = () => setCurrent(steps[Math.max(currentIndex - 1, 0)].id)

  const resetAll = () => {
    setFormData({})
    setCurrent(steps[0].id)
    setSubmitted(false)
    setValidSteps({})
  }

  const isCurrentValid = !!validSteps[current]

  return (
    <div className='flex items-center justify-center'>
      <Stepper
        steps={steps}
        value={current}
        onValueChange={v => {
          if (submitted) return
          if (!isCurrentValid && v !== current) return
          setCurrent(v)
        }}
        className='flex flex-col items-center justify-center gap-6'
        orientation='horizontal'
      >
        <StepperNav>
          {steps.map((step, index) => (
            <StepperItem key={index} stepId={step.id} className='relative flex-1'>
              <StepperTrigger
                className={cn('flex flex-col gap-2.5', submitted || !isCurrentValid ? 'pointer-events-none' : '')}
                aria-disabled={submitted || !isCurrentValid}
              >
                <StepperIndicator
                  className={
                    submitted
                      ? 'group-data-[state=active]/step:ring-green-600/40 data-[state=active]:bg-green-600/20 data-[state=active]:text-green-600 data-[state=completed]:bg-green-600/20 data-[state=completed]:text-green-600 dark:group-data-[state=active]/step:ring-green-400/40 dark:data-[state=completed]:bg-green-400/20 dark:data-[state=completed]:text-green-400'
                      : ''
                  }
                >
                  {index + 1}
                </StepperIndicator>
                <StepperTitle className={`${submitted ? 'text-muted-foreground' : ''}`}>{step.title}</StepperTitle>
              </StepperTrigger>
              {steps.length > index + 1 && (
                <StepperSeparator
                  className={cn(
                    'absolute inset-x-0 top-2 right-[calc(-50%+18px)] left-[calc(50%+18px)]',
                    submitted
                      ? 'group-data-[state=completed]/step:bg-green-600/20 dark:group-data-[state=completed]/step:bg-green-400/20'
                      : ''
                  )}
                />
              )}
            </StepperItem>
          ))}
        </StepperNav>
        <StepperPanel className='w-xs text-center text-sm sm:w-xl'>
          {steps.map(step => (
            <StepperContent key={step.id} value={step.id}>
              <div className='flex flex-col items-center gap-4 px-8'>
                <div className='w-full'>
                  <div className='text-muted-foreground'>
                    {step.id === 'details' && (
                      <PersonalInfoForm
                        defaultValues={formData.personal}
                        onNext={(data: PersonalInfo) => {
                          setFormData(prev => ({ ...prev, personal: data }))
                          setValidSteps(prev => ({ ...prev, details: true }))
                          goNext()
                        }}
                      />
                    )}

                    {step.id === 'review' && (
                      <ContactInfoForm
                        defaultValues={formData.contact}
                        onPrev={() => goBack()}
                        showPrev={!submitted}
                        onNext={(data: ContactInfo) => {
                          setFormData(prev => ({ ...prev, contact: data }))
                          setValidSteps(prev => ({ ...prev, review: true }))
                          goNext()
                        }}
                      />
                    )}

                    {step.id === 'done' && (
                      <AddressForm
                        defaultValues={formData.address}
                        onPrev={() => goBack()}
                        onReset={resetAll}
                        showPrev={!submitted}
                        onNext={(data: Address) => {
                          setFormData(prev => ({ ...prev, address: data }))
                          setValidSteps(prev => ({ ...prev, done: true }))
                          setSubmitted(true)
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </StepperContent>
          ))}
        </StepperPanel>
      </Stepper>
    </div>
  )
}

export default StepperFormDemo
