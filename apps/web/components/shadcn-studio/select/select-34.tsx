import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectMultipleDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Native multiple select</Label>
      <div className='border-input overflow-hidden rounded-lg border leading-none'>
        <NativeSelect
          id={id}
          multiple
          className='w-full *:h-full *:border-0 **:px-2.5 **:py-1 *:focus-visible:border-none *:focus-visible:ring-0 *:data-[slot=native-select]:px-0'
        >
          <NativeSelectOption value='1'>Vegetarian</NativeSelectOption>
          <NativeSelectOption value='2'>Vegan</NativeSelectOption>
          <NativeSelectOption value='3'>Gluten-Free</NativeSelectOption>
          <NativeSelectOption value='4'>Halal</NativeSelectOption>
          <NativeSelectOption value='5'>Kosher</NativeSelectOption>
          <NativeSelectOption value='6'>Dairy-Free</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  )
}

export default NativeSelectMultipleDemo
