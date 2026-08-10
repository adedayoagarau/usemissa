'use client'

import { useId } from 'react'

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'

const frameworks = ['Next.js', 'SvelteKit', 'Nuxt.js', 'Remix', 'Astro', 'React', 'Vue', 'Angular', 'SolidJS', 'Qwik']

const ComboboxMultipleDemo = () => {
  const id = useId()
  const anchor = useComboboxAnchor()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Multiple combobox</Label>
      <Combobox multiple autoHighlight id={id} items={frameworks} defaultValue={[frameworks[0], frameworks[1]]}>
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {values => (
              <>
                {values.map((value: string) => (
                  <ComboboxChip key={value}>{value}</ComboboxChip>
                ))}
                <ComboboxChipsInput />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {item => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxMultipleDemo
