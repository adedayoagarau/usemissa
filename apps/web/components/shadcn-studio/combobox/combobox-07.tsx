'use client'

import { useId, useMemo } from 'react'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'

const ComboboxTimezoneDemo = () => {
  const id = useId()

  // Fetch supported timezones
  const timezones = Intl.supportedValuesOf('timeZone')

  const formattedTimezones = useMemo(() => {
    return timezones
      .map(timezone => {
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: timezone,
          timeZoneName: 'shortOffset'
        })

        const parts = formatter.formatToParts(new Date())
        const offset = parts.find(part => part.type === 'timeZoneName')?.value || ''
        const formattedOffset = offset === 'GMT' ? 'GMT+0' : offset

        return {
          value: timezone,
          label: `(${formattedOffset}) ${timezone.replace(/_/g, ' ')}`,
          numericOffset: parseInt(formattedOffset.replace('GMT', '').replace('+', '') || '0')
        }
      })
      .sort((a, b) => a.numericOffset - b.numericOffset) // Sort by numeric offset
  }, [timezones])

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Timezone combobox</Label>
      <Combobox id={id} items={formattedTimezones}>
        <ComboboxInput placeholder='Select a timezone' />
        <ComboboxContent>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {item => (
              <ComboboxItem key={item.value} value={item.label}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxTimezoneDemo
