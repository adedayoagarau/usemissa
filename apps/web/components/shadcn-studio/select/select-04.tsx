import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectWithHelperTextDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Native select with helper text</Label>
      <NativeSelect id={id}>
        <NativeSelectOption value='1'>Florida</NativeSelectOption>
        <NativeSelectOption value='2'>California</NativeSelectOption>
        <NativeSelectOption value='3'>San Francisco</NativeSelectOption>
        <NativeSelectOption value='4'>Alabama</NativeSelectOption>
      </NativeSelect>
      <p className='text-muted-foreground mt-2 text-xs' role='region' aria-live='polite'>
        Could you share which city you&apos;re based in?
      </p>
    </div>
  )
}

export default NativeSelectWithHelperTextDemo
