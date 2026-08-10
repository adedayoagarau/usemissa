'use client'

import { useId, useState } from 'react'
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList
} from '@/components/ui/autocomplete'
import { Label } from '@/components/ui/label'
import { MonitorIcon, HospitalIcon, DollarSignIcon, SchoolIcon, FilmIcon, FactoryIcon, ZapIcon, HotelIcon, ScaleIcon, TractorIcon } from "lucide-react"

const items = [
  {
    id: 'information-technology',
    value: 'information technology',
    label: 'Information Technology',
    icon: (
      <MonitorIcon
      />
    )
  },
  {
    id: 'healthcare',
    value: 'healthcare',
    label: 'Healthcare',
    icon: (
      <HospitalIcon
      />
    )
  },
  {
    id: 'finance',
    value: 'finance',
    label: 'Finance',
    icon: (
      <DollarSignIcon
      />
    )
  },
  {
    id: 'education',
    value: 'education',
    label: 'Education',
    icon: (
      <SchoolIcon
      />
    )
  },
  {
    id: 'entertainment',
    value: 'entertainment',
    label: 'Entertainment',
    icon: (
      <FilmIcon
      />
    )
  },
  {
    id: 'manufacturing',
    value: 'manufacturing',
    label: 'Manufacturing',
    icon: (
      <FactoryIcon
      />
    )
  },
  {
    id: 'energy',
    value: 'energy',
    label: 'Energy',
    icon: (
      <ZapIcon
      />
    )
  },
  {
    id: 'hospitality',
    value: 'hospitality',
    label: 'Hospitality',
    icon: (
      <HotelIcon
      />
    )
  },
  {
    id: 'legal',
    value: 'legal',
    label: 'Legal',
    icon: (
      <ScaleIcon
      />
    )
  },
  {
    id: 'agriculture',
    value: 'agriculture',
    label: 'Agriculture',
    icon: (
      <TractorIcon
      />
    )
  }
]

const AutocompleteWithIcon = () => {
  const id = useId()
  const [value, setValue] = useState('')

  const selectedItem = items.find(item => item.value === value)

  return (
    <div className='w-full max-w-xs'>
      <Autocomplete items={items} value={value} onValueChange={setValue}>
        <div className='flex flex-col items-start gap-2'>
          <Label htmlFor={id}>Autocomplete with icon</Label>
          <div className='relative w-full'>
            {selectedItem?.icon && (
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 shrink-0 -translate-y-1/2'>
                {selectedItem.icon}
              </span>
            )}
            <AutocompleteInput id={id} placeholder='search: Docs' className={selectedItem?.icon ? 'pl-8' : undefined} />
          </div>
        </div>
        <AutocompleteContent>
          <AutocompleteEmpty>No items found.</AutocompleteEmpty>
          <AutocompleteList>
            {item => (
              <AutocompleteItem
                key={item.id}
                value={item.value}
                className='*:[svg]:text-muted-foreground *:[svg]:size-4 *:[svg]:shrink-0'
              >
                {item.icon}
                {item.value}
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
    </div>
  )
}

export default AutocompleteWithIcon
