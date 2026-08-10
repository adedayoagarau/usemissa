'use client'

import { useId } from 'react'

import { usePaymentInputs } from 'react-payment-inputs'
import images, { type CardImages } from 'react-payment-inputs/images'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { CreditCardIcon } from "lucide-react"

const InputCardDetailsDemo = () => {
  const id = useId()
  const { meta, getCardNumberProps, getExpiryDateProps, getCVCProps, getCardImageProps } = usePaymentInputs()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label>Card details</Label>
      <div>
        <InputGroup className='rounded-b-none focus-within:z-1'>
          <InputGroupInput {...getCardNumberProps()} id={`number-${id}`} className='' />
          <InputGroupAddon align='inline-end' className='pointer-events-none'>
            {meta.cardType ? (
              <svg
                className='size-6 overflow-hidden'
                {...getCardImageProps({
                  images: images as unknown as CardImages
                })}
              />
            ) : (
              <CreditCardIcon className='size-4' />
            )}
            <span className='sr-only'>Card Provider</span>
          </InputGroupAddon>
        </InputGroup>
        <div className='-mt-px flex'>
          <div className='min-w-0 flex-1 focus-within:z-1'>
            <Input
              {...getExpiryDateProps()}
              id={`expiry-${id}`}
              className='rounded-t-none rounded-r-none shadow-none'
            />
          </div>
          <div className='-ms-px min-w-0 flex-1 focus-within:z-1'>
            <Input {...getCVCProps()} id={`cvc-${id}`} className='rounded-t-none rounded-l-none shadow-none' />
          </div>
        </div>
      </div>
      <p className='text-muted-foreground text-xs'>
        Built with{' '}
        <a
          className='hover:text-foreground underline'
          href='https://github.com/medipass/react-payment-inputs'
          target='_blank'
          rel='noopener noreferrer'
        >
          React Payment Inputs
        </a>
      </p>
    </div>
  )
}

export default InputCardDetailsDemo
