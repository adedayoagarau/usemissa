import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectPlaceholderDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Native select with placeholder</Label>
      <NativeSelect id={id} defaultValue=''>
        <NativeSelectOption value='' disabled>
          Please select a gender
        </NativeSelectOption>
        <NativeSelectOption value='1'>Male</NativeSelectOption>
        <NativeSelectOption value='2'>Female</NativeSelectOption>
        <NativeSelectOption value='3'>Other</NativeSelectOption>
      </NativeSelect>
    </div>
  )
}

export default NativeSelectPlaceholderDemo
