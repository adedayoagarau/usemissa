'use client'

import { useId } from 'react'

import { usePaymentInputs } from 'react-payment-inputs'
import images, { type CardImages } from 'react-payment-inputs/images'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { CreditCardIcon } from "lucide-react"

const InputCardNumberDemo = () => {
  const id = useId()
  const { meta, getCardNumberProps, getCardImageProps } = usePaymentInputs()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Card number</Label>
      <InputGroup>
        <InputGroupInput {...getCardNumberProps()} id={id} />
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

export default InputCardNumberDemo
