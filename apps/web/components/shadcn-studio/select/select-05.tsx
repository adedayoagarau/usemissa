import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const NativeSelectWithErrorDemo = () => {
  const id = useId()

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Native select with error</Label>
      <NativeSelect id={id} aria-invalid>
        <NativeSelectOption value='1'>IST (Indian Standard Time)</NativeSelectOption>
        <NativeSelectOption value='2'>EST (Eastern Standard Time)</NativeSelectOption>
        <NativeSelectOption value='3'>PST (Pacific Standard Time)</NativeSelectOption>
        <NativeSelectOption value='4'>GMT (Greenwich Mean Time)</NativeSelectOption>
      </NativeSelect>
      <p className='text-destructive mt-2 text-xs' role='alert' aria-live='polite'>
        Selected option is invalid
      </p>
    </div>
  )
}

export default NativeSelectWithErrorDemo
