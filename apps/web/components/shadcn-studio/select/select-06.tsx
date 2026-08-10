import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectRequiredDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id} className='gap-1'>
        Required native select <span className='text-destructive'>*</span>
      </Label>
      <NativeSelect id={id} required>
        <NativeSelectOption value='1'>Action</NativeSelectOption>
        <NativeSelectOption value='2'>Comedy</NativeSelectOption>
        <NativeSelectOption value='3'>Romance</NativeSelectOption>
        <NativeSelectOption value='4'>Thriller</NativeSelectOption>
      </NativeSelect>
    </div>
  )
}

export default NativeSelectRequiredDemo
