'use client'

import { useId } from 'react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { MonitorIcon, HospitalIcon, DollarSignIcon, SchoolIcon, FilmIcon, FactoryIcon, ZapIcon, HotelIcon, ScaleIcon, TractorIcon } from "lucide-react"

const industries = [
  {
    value: 'information technology',
    label: 'Information Technology',
    icon: (
      <MonitorIcon
      />
    )
  },
  {
    value: 'healthcare',
    label: 'Healthcare',
    icon: (
      <HospitalIcon
      />
    )
  },
  {
    value: 'finance',
    label: 'Finance',
    icon: (
      <DollarSignIcon
      />
    )
  },
  {
    value: 'education',
    label: 'Education',
    icon: (
      <SchoolIcon
      />
    )
  },
  {
    value: 'entertainment',
    label: 'Entertainment',
    icon: (
      <FilmIcon
      />
    )
  },
  {
    value: 'manufacturing',
    label: 'Manufacturing',
    icon: (
      <FactoryIcon
      />
    )
  },
  {
    value: 'energy',
    label: 'Energy',
    icon: (
      <ZapIcon
      />
    )
  },
  {
    value: 'hospitality',
    label: 'Hospitality',
    icon: (
      <HotelIcon
      />
    )
  },
  {
    value: 'legal',
    label: 'Legal',
    icon: (
      <ScaleIcon
      />
    )
  },
  {
    value: 'agriculture',
    label: 'Agriculture',
    icon: (
      <TractorIcon
      />
    )
  }
]

const ComboboxOptionWithIIconDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Combobox option with icon</Label>
      <Combobox id={id} items={industries}>
        <ComboboxInput placeholder='Select an industry' />
        <ComboboxContent>
          <ComboboxEmpty>No industries found.</ComboboxEmpty>
          <ComboboxList>
            {item => (
              <ComboboxItem
                key={item.value}
                value={item.value}
                className='*:[svg]:text-muted-foreground flex items-center gap-2 *:[svg]:size-4'
              >
                {item.icon}
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxOptionWithIIconDemo
