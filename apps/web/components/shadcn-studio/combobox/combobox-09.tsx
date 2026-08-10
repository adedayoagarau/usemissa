'use client'

import { useId, useState } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react'

import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'

const countries = [
  { value: '1', label: 'India', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/india.png' },
  { value: '2', label: 'China', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/china.png' },
  { value: '3', label: 'Monaco', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/monaco.png' },
  { value: '4', label: 'Serbia', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/serbia.png' },
  { value: '5', label: 'Romania', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/romania.png' },
  { value: '6', label: 'Mayotte', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/mayotte.png' },
  { value: '7', label: 'Iraq', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/iraq.png' },
  { value: '8', label: 'Syria', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/syria.png' },
  { value: '9', label: 'Korea', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/korea.png' },
  { value: '10', label: 'Zimbabwe', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/zimbabwe.png' }
]

const ComboboxInput = ({
  className,
  children,
  disabled = false,
  showTrigger = true,
  flag,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  flag?: string
}) => {
  return (
    <InputGroup className={cn('w-auto', className)}>
      {flag && (
        <InputGroupAddon>
          <img src={flag} alt='Country flag' className='h-4 w-5' />
        </InputGroupAddon>
      )}
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
      <InputGroupAddon align='inline-end'>
        {showTrigger && (
          <InputGroupButton
            size='icon-xs'
            variant='ghost'
            render={<ComboboxTrigger />}
            data-slot='input-group-button'
            className='data-pressed:bg-transparent'
            disabled={disabled}
          />
        )}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

const ComboboxCountryFlagDemo = () => {
  const id = useId()
  const [value, setValue] = useState<string>('')
  const selectedCountry = countries.find(u => u.label === value)

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Options with flag and search</Label>
      <Combobox id={id} items={countries} value={value} onValueChange={v => setValue(v ?? '')}>
        <ComboboxInput placeholder='Select a country' flag={selectedCountry?.flag} />
        <ComboboxContent>
          <ComboboxEmpty>No countries found.</ComboboxEmpty>
          <ComboboxList>
            {item => (
              <ComboboxItem key={item.value} value={item.label} className='flex items-center gap-2'>
                <img src={item.flag} alt={`${item.label} flag`} className='h-4 w-5' />
                <span className='flex flex-col'>
                  <span className='font-medium'>{item.label}</span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxCountryFlagDemo
