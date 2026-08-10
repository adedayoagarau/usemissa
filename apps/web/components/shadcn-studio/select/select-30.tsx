'use client'

import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const countries = [
  {
    value: null,
    label: 'Select country'
  },
  {
    value: '1',
    label: 'India',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/india.png'
  },
  {
    value: '2',
    label: 'China',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/china.png'
  },
  {
    value: '3',
    label: 'Monaco',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/monaco.png'
  },
  {
    value: '4',
    label: 'Serbia',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/serbia.png'
  },
  {
    value: '5',
    label: 'Romania',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/romania.png'
  },
  {
    value: '6',
    label: 'Mayotte',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/mayotte.png'
  },
  {
    value: '7',
    label: 'Iraq',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/iraq.png'
  },
  {
    value: '8',
    label: 'Syria',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/syria.png'
  },
  {
    value: '9',
    label: 'Korea',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/korea.png'
  },
  {
    value: '10',
    label: 'Zimbabwe',
    flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/zimbabwe.png'
  }
]

const SelectWithFlagsDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Options with flag</Label>
      <Select items={countries} defaultValue='1'>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue>
            {(value: string) => {
              const country = countries.find(c => c.value === value)

              return country && country.flag ? (
                <span className='flex items-center gap-2'>
                  <img src={country.flag} alt={`${country.label} flag`} className='h-4 w-5 shrink-0' />
                  <span className='truncate'>{country.label}</span>
                </span>
              ) : null
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className='max-h-100 p-1'>
          {countries.slice(1).map(country => (
            <SelectItem key={country.value} value={country.value} className='*:items-center'>
              <img src={country.flag} alt={`${country.label} flag`} className='h-4 w-5' />{' '}
              <span className='truncate'>{country.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectWithFlagsDemo
